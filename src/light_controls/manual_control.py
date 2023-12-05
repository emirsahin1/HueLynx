from lifxlan import RGBtoHSBK
from utils import get_lights
import json
import sys

# Screenshots the screen and sends the average color to the lights
def main():
    light_list = json.loads(sys.argv[1])
    scale = float(sys.argv[2]) #Scales the brightness of the lights 0-1

    # check if we have a list of lights and parse it
    lights = get_lights(light_list)
    lights.set_power(1, 0, True)
    print("OK", flush=True) # Client reads this to show toast that everything is OK

    
    
    while True:
        # Read a line from stdin, which contains the RGB values
        rgb_input = sys.stdin.readline().strip()

        # Check if the input is not empty
        if rgb_input:
            # Parse the RGB values
            try:
                print("RGB input:", rgb_input, flush=True)
                color = tuple(int(scale * int(value)) for value in rgb_input.split(','))

                # Set the lights to the new color
                lights.set_color(RGBtoHSBK(color), 0, True)  # Assuming such a method exists

            except ValueError:
                print("Invalid RGB input", flush=True)

if __name__=="__main__":
    main()

