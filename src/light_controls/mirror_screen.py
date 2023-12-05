from lifxlan import RGBtoHSBK
from utils import get_lights
import json
import mss.tools
import sys
import numpy as np
import cv2
import time

# Screenshots the screen and sends the average color to the lights
def main():
    light_list = json.loads(sys.argv[1])
    region = json.loads(sys.argv[2])
    duration = sys.argv[3]
    scale = float(sys.argv[4]) #Scales the brightness of the lights 0-1

    # check if we have a list of lights and parse it
    lights = get_lights(light_list)

    lights.set_power(1, 0, True)
    monitor = {"top": region["y"], "left": region["x"], "width": region["width"], "height": region["height"]}

    # Initial Test run to make sure everyhting works
    # If it doesn't work, it will throw an error that we can show in client
    with mss.mss() as sct:
        sct_img = sct.grab(monitor) 
        img = np.array(sct_img)
        color = cv2.mean(img)[:3]
        color = (int(color[2]*scale), int(color[1]*scale), int(color[0]*scale))


    print("OK", flush=True) # Client reads this to show toast that everything is OK
    with mss.mss() as sct:
        while(True):
                time.sleep(0.01)
                sct_img = sct.grab(monitor) 
                img = np.array(sct_img)
                color = cv2.mean(img)[:3]
                color = (int(color[2]*scale), int(color[1]*scale), int(color[0]*scale))
                lights.set_color(RGBtoHSBK(color), duration, True)


if __name__=="__main__":
    main()

