// minified url to local modules on github repo
const SGP30 = require("https://git.io/JsgXu");
const RN2483 = require("https://git.io/JsgXY");
const Parser = require("parser");

Serial3.setup(57600/25*8, { tx:D8, rx:D9 });
var lora = new RN2483(Serial3, {reset: E13, debug: true});

var i2c = new I2C();
i2c.setup({sda:C9,scl:A8});
var sgp30 = new SGP30(i2c);

var interval = 2 * 60000;
var interval_id;

function convert_to_payload(json) {
  var payload = Parser.encode_payload({
    "3325": [
      json.co2,
      json.tvoc,
      json.h2,
      json.eth
    ]
  })

  return payload;
}

lora.on('message', function(d) {
  var val = parseInt(d.substring(9), 16)

  if (val > 3500) {
    digitalWrite(E12, 1);
    digitalWrite(E15, 0);
  } else {
    digitalWrite(E15, 1);
    digitalWrite(E12, 0);
  }
});

lora.on('connexion', function(d) {
  if (d == 'denied') {
    join_lora();
  } else if (d == 'accepted') {
    console.log("Starting measures")
    start_interval(interval);
  }
});

function init_lora() {
  lora.reset(function() {
    lora.setOtaaParams(
      "70B3D57ED003EB65",
      "8B8DCD2946A9E230E2FB07A8632BD32F",
      (err) => {
        if (!err) {
          join_lora();
        } else {
          console.log("error setting params: ", err)
        }
      }
    )
  })
}

function join_lora() {
  lora.connectOtaa()
  .catch((err) => {
    console.log("Error: ", err)
    if (err.indexOf("no_free_ch") != -1) {
      console.log("retrying to connect");
      setTimeout(join_lora, 30000);
    }
  });
}

function send_payload(payload) {
  lora.loraTX(payload, err => {
    if (err) {
      console.log("Error: " + err);
      if (err == "no_free_ch") {
        // if no free chan try to resend the payload after a moment
        setTimeout(() => send_payload(payload), 30000);
      }
    }
    else console.log("Send payload: " + payload);
  })
}

function start_interval(inter) {
  interval_id = setInterval(() => {
    sgp30.get_sensor_data()
    .then((data) => {
      var payload = convert_to_payload(data);
      send_payload(payload);
    })
    .catch((err) => {
      console.log(err);
    });
  }, inter);
}

function onInit() {
  join_lora();
}

save();