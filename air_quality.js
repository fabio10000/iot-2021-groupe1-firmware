var RN2483 = require("rn2483");
Serial3.setup(57600/25*8, { tx:D8, rx:D9 });
var lora = new RN2483(Serial3, {reset: E13, debug: true});

const SGP30 = require("sgp30");
var i2c = new I2C();
i2c.setup({sda:C9,scl:A8});
var sgp30 = new SGP30(i2c);

var interval = 2 * 60000;

function decimal_to_hex(d, padding) {
  var hex = Number(d).toString(16);
  padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

  while (hex.length < padding) {
      hex = "0" + hex;
  }

  return hex;
}

function convert_to_payload(json) {
  var payload = decimal_to_hex(json.co2, 4);
  payload += decimal_to_hex(json.tvoc, 4);
  payload += decimal_to_hex(json.h2, 4);
  payload += decimal_to_hex(json.eth, 4);

  return payload;
}

function parse_payload(payload) {
  var op_code = string_to_hex(payload.substring(0,2))
  
  switch(op_code) {
    case 0x00:
      // change interval
      var payload_data = string_to_hex(payload.substring(2));
      var time = payload_data >> 2;
      var unit = payload_data & 0x03;
      var unit_mult = 1000;
      switch(unit) {
        case 2:
          unit_mult *= 24
        case 1:
          unit_mult *= 60
        case 0:
          unit_mult *= 60
          break;
        default:
          throw new Error("Unknown unit");
      }

      if (time < 1) throw new Error("Time must be at least 1 <unit>");

      interval = time * unit_mult;
      console.log(`New interval: ${interval}ms`);
      break;
    case 0x01:
      // get temp from node 2
      var temp = string_to_hex(payload.substring(2,4));
      
      if (temp > 28) {
        digitalWrite(E12, 1);
        console.log("it's hot turned LED on");
      } else {
        digitalWrite(E12, 0);
        console.log("it's cold turned LED off");
      }
      break;
    default:
      throw new Error("Unknown op_code");
  }
}

function string_to_hex(text) {
	return Number(`0x${text}`)
}

lora.on('message', function(d) {
  parse_payload(d.substring(9));
});

function join_lora() {
  return new Promise((resolve) => {
    lora.LoRaWAN(
      "2601353C", // device address
      "8186B549CFA39818E3209E6DE699A1B4", // nwkSKey
      "03B8F9B04FD3B4C9C0CF7E0FEC7E9837", // appSKey
      err => {
        if (err) throw Error(err);
        else resolve();
      }
    );
  });
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
        setTimeout(send_payload, 30000);
      }
    }
    else console.log("Send payload: " + payload);
  })
}

function onInit() {
  join_lora();

  setInterval(() => {
    sgp30.get_sensor_data()
    .then((data) => {
      var payload = convert_to_payload(data);
      send_payload(payload);
    })
    .catch((err) => {
      console.log(err);
      err.resolve();
    });
  }, interval);
}

save();