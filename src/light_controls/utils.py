from lifxlan import Light, Group

def get_lights(light_list):
    if len(light_list) == 0:
        print("No lights found", flush=True)
        return None

    lights = []
    for light in light_list:
        lights.append(Light(light["mac"], light["ip"]))
    lights = Group(lights)
    return lights