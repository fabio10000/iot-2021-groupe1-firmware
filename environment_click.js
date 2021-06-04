const DELAY = 3 * 60000;
// minified url to local modules on github repo
const RN2483 = require("https://git.io/JsgXY");
const Parser = require("https://git.io/JGMMf");

Serial3.setup(57600/25*8, { tx:D8, rx:D9 });
var lora = new RN2483(Serial3, {reset: E13, debug: true});
var i2c = new I2C();
i2c.setup({sda:C9,scl:A8});
var bme = require("BME680").connectI2C(i2c, {addr:0x77});

function convert_to_payload(json) {
  // todo: vérifier les arrondis
  var payload = Parser.encode_payload({
    "3303": json.temperature,
    "3304": json.humidity,
    "3315": json.pressure
  })

  return payload;
}

lora.on('message', function(d) {
  var data = Parser.decode_payload(d)

  //todo vérifier la valeur choisie
  if (data["3302"] > 12) {
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
    setInterval(() => {
      var data = bme.get_sensor_data();
      var payload = convert_to_payload(data);
      send_payload(payload);
  
      bme.perform_measurement();
    }, DELAY);
  }
});

function init_lora() {
  lora.reset(function() {
    lora.setOtaaParams(
      "70B3D57ED003EB65",
      "AB519DEEA485A5CEE5232E1FA109E730",
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

function onInit() {
  join_lora();
}

save();