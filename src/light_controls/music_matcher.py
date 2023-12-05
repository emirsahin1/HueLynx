import pyaudiowpatch as pyaudio
import numpy as np
from lifxlan import RGBtoHSBK
from utils import get_lights
import sys
import json
from scipy.ndimage import gaussian_filter1d
from scipy.signal import windows


def audio_callback(in_data, frame_count, time_info, status):
    global baseline_level, threshold, sma, sma_window, sample_rate 
    global lights, duration, min_freq, max_freq, base_color, peak_color, noise_gate

    # Convert byte data to numpy array
    audio_data = np.frombuffer(in_data, dtype=np.int16)
    window = windows.hann(len(audio_data))

    # Apply the window function
    windowed_audio_data = audio_data * window

    # Perform FFT and get magnitude spectrum
    fft_data = np.fft.fft(windowed_audio_data)
    freq_magnitudes = np.abs(fft_data)

    num_samples = len(audio_data)
    freq_bins = np.fft.fftfreq(num_samples, d=1/sample_rate) # Get frequency bins
    relevant_freq_indices = np.nonzero((freq_bins >= min_freq) & (freq_bins <= max_freq))[0] # Find relevant indices
    relevant_freqs_avg = np.mean(freq_magnitudes[relevant_freq_indices]) # Calculate average magnitude

    # Calculate simple moving average
    sma = np.roll(sma, -1) 
    sma[-1] = relevant_freqs_avg  

    sigma = 7  # Standard deviation for Gaussian kernel, adjust as needed
    smoothed_sma = gaussian_filter1d(sma, sigma)
    baseline_level = np.median(smoothed_sma)
    

    # If the baseline level is too low, don't do anything.
    # This is to prevent the lights from turning on when there is no music playing.
    if(baseline_level < noise_gate):
        return (in_data, pyaudio.paContinue)

    # Detect peak
    if relevant_freqs_avg > baseline_level * threshold:
        # normalized_magnitude = relevant_freqs_avg / np.max(freq_magnitudes)
        lights.set_color(RGBtoHSBK(peak_color), duration, True)
    else:
        lights.set_color(RGBtoHSBK(base_color), duration, True) #Set to base color

    return (in_data, pyaudio.paContinue)


def main():
    global baseline_level, threshold, sma, sma_window, sample_rate
    global lights, duration, min_freq, max_freq, base_color, peak_color, noise_gate

    # Initialize variables for dynamic peak detection
    baseline_level = 0
    # threshold = 1.2 
    # sma_window = 3 # Simple moving average window

    print("Starting music matcher...", flush=True)
    light_list = json.loads(sys.argv[1])
    duration = sys.argv[2]
    threshold = float(sys.argv[3])
    sma_window = int(sys.argv[4])
    min_freq = int(sys.argv[5])
    max_freq = int(sys.argv[6])
    base_color = tuple(json.loads(sys.argv[7]).values())
    peak_color = tuple(json.loads(sys.argv[8]).values())
    noise_gate = float(sys.argv[9])
    sma = np.zeros(sma_window) 
    sample_rate = 44100
    print("Loaded Vars...", flush=True)
    print(base_color, peak_color, flush=True)

    # check if we have a list of lights and parse it
    lights = get_lights(light_list)
    lights.set_power(1, 0, True)
  
    with pyaudio.PyAudio() as p:
        try:
            wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
        except OSError:
            print("Looks like WASAPI is not available on the system. Exiting...")
            exit()

        default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])

        if not default_speakers["isLoopbackDevice"]:
            for loopback in p.get_loopback_device_info_generator():
                if default_speakers["name"] in loopback["name"]:
                    default_speakers = loopback
                    break
            else:
                print("Default loopback output device not found.\nExiting...\n")
                exit()


        with p.open(format=pyaudio.paInt16,
                    channels=default_speakers["maxInputChannels"],
                    rate=int(default_speakers["defaultSampleRate"]),
                    frames_per_buffer=512,
                    input=True,
                    input_device_index=default_speakers["index"],
                    stream_callback=audio_callback
                    ) as stream:

            print("OK", flush=True) # Client reads this to show toast that everything is OK
            while stream.is_active(): 
                continue


if __name__=="__main__":
    main()

