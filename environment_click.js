const DELAY = 3 * 60000;
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

function join_lora() {
  return new Promise(
    (resolve) => {
      lora.LoRaWAN(
        "26015E66", // device address
        "98F821733B69373525EB71C2AFF9AAC7", // nwkSKey
        "A8B95D9E0A4B7EF4448BCD3A091495A7", // appSKey
        err => {
          if (err) {
            throw Error(err);
            // error connection
          } else {
            resolve();
          }
        }
      );
    }
  )
}

function send_payload(payload) {
  lora.loraTX(payload, err => {
    if (err) {
      console.log("Error: " + err);
      if (err == "not_joined") {
        // if not joined try to join and resend the payload
        join_lora()
        .then(() => send_payload(payload))
        .catch(() => console.log("Unhable to join lora network"));
      } else if (err == "no_free_ch") {
        // if no free chan try to resend the payload after a moment
        setTimeout(send_payload, 5000);
      }
    }
    else console.log("Send payload: " + payload);
  })
}

function onInit() {
  join_lora();

  setInterval(() => {
    var data = bme.get_sensor_data();
    var payload = convert_to_payload(data);
    send_payload(payload);

    bme.perform_measurement();
  }, DELAY);
}

save();