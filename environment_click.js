const DELAY = 2 * 60000;
var RN2483 = require("rn2483");
Serial3.setup(57600/25*8, { tx:D8, rx:D9 });
var lora = new RN2483(Serial3, {reset: E13, debug: true});
var i2c = new I2C();
i2c.setup({sda:C9,scl:A8});
var bme = require("BME680").connectI2C(i2c, {addr:0x77});

function decimal_to_hex(d, padding) {
  var hex = Number(d).toString(16);
  padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

  while (hex.length < padding) {
      hex = "0" + hex;
  }

  return hex;
}

function convert_to_payload(json) {
  var payload = decimal_to_hex(Math.round(json.temperature));
  payload += decimal_to_hex(Math.round(json.humidity));
  payload += decimal_to_hex(Math.round(json.pressure), 4);

  return payload;
}

function onInit() {
  lora.LoRaWAN(
    "26015E66", // device address
    "98F821733B69373525EB71C2AFF9AAC7", // nwkSKey
    "A8B95D9E0A4B7EF4448BCD3A091495A7", // appSKey
    err => {
      if (err) throw Error(err);
    }
  );

  setInterval(() => {
    var data = bme.get_sensor_data();
    var payload = convert_to_payload(data);
    lora.loraTX(payload, err => {
      if (err) throw Error(err);
    })

    bme.perform_measurement();
  }, DELAY);
}

save();