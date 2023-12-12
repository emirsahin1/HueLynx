from lifxlan import RGBtoHSBK
from utils import get_lights
import json
import sys

# Waits for RGB input from stdin and sets the lights to that color
def main():
    light_list = json.loads(sys.argv[1])
    scale = float(sys.argv[2]) #Scales the brightness of the lights 0-1

    lights = get_lights(light_list)
    lights.set_power(1, 0, True)
    print("OK", flush=True) # Client reads this to show toast that everything is OK

    while True:
        rgb_input = sys.stdin.readline().strip()

        if rgb_input:
            try:
                print("RGB input:", rgb_input, flush=True)
                color = tuple(int(scale * int(value)) for value in rgb_input.split(','))

                # Set the lights to the new color
                lights.set_color(RGBtoHSBK(color), 0, True)

            except ValueError:
                print("Invalid RGB input", flush=True)

if __name__=="__main__":
    main()

