# iot-2021-groupe1-firmware

## OTAA config

* Get the *deveui*: `sendToRn2483("mac get deveui")`
* Create a device inside ttn application with previous *deveui*
* execute the following to configure the different keys:
  * `sendToRn2483("sys factoryRESET")`
  * `sendToRn2483("mac set appeui xxx")`
  * `sendToRn2483("mac set appkey xxx")`
  * `sendToRn2483("mac save")`

* Connect to the gateway: `sendToRn2483("mac join otaa")`
