from distutils.core import setup # Need this to handle modules
import py2exe 
from lifxlan import RGBtoHSBK
from utils import get_lights
import json
import mss.tools
import sys
import numpy as np
import cv2
import time
setup(console=['src\light_controls\mirror_screen.py']) # Calls setup function to indicate that we're dealing with a single console application