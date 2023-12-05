from lifxlan import LifxLAN
import json

def main():
    lifx = LifxLAN()
    json_data = {}

    # get devices
    devices = lifx.get_lights()
    name_list = []
    group_dict = {}

    # name list should have object with name mac address and ip
    for device in devices:
        light_obj = {"name": device.get_label(), "mac": device.get_mac_addr(), "ip": device.get_ip_addr()}
        name_list.append(light_obj)
        
        if device.get_group() in group_dict:
            group_dict[device.get_group()]["lights"].append(light_obj)
        else:
            group_dict[device.get_group()] = {"name": device.get_group_label(), "lights": [light_obj]}
        

    json_data["Count"] = len(devices)
    json_data["Lights"] = name_list
    json_data["Groups"] = group_dict

    json_string = json.dumps(json_data)
    print(json_string, flush=True)


if __name__=="__main__":
    main()


