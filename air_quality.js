/* RN2483 must be plugged in slot #2 !!! */

/* See https://download.mikroe.com/documents/starter-boards/clicker-2/stm32f4/clicker2-stm32-manual-v100.pdf
for board full schematic and pins assignment */

var serialRxData = "";
const SGP30_ADDRESS = 0x58;
const CRC8_POLYNOMIAL = 0x31;
const MEASURES_INTERVAL = 5*60000;

var state = "";

/* Serial port initialisation (the "/25*8" is a work-around because of bad
internal clock initialisation) */
Serial3.setup(57600/25*8, { tx:D8, rx:D9 });
I2C3.setup({scl:A8, sda:C9});

function text_to_hex(payload) {
  let result = "";
  for (var i = 0; i < payload.length; i++) {
    result += payload.charCodeAt(i).toString(16);
  }
  return result;
}

function send_data(payload) {
  state = "sending";
  const hex_data = text_to_hex(payload);
  sendToRn2483(`mac tx uncnf 1 ${hex_data}`);
}

function start_mesures() {
  console.log("Mesures starting...");
  // air measure (CO2 and TVOC)
  i2c_burst_read(SGP30_ADDRESS, 0x2008, 6, 12, (air_data) => {
    console.log("Air measure done:");
    console.log(`* Co2: ${air_data[0]}ppm`);
    console.log(`* TVOC: ${air_data[1]}ppb`);

    i2c_burst_read(SGP30_ADDRESS, 0x2050, 6, 25, (hum_data) => {
      console.log("\nRaw signals measure done:");
      console.log(`* H2: ${hum_data[0]}`);
      console.log(`* Eth: ${hum_data[1]}`);

      console.log("\nSending data...\n");
      const payload = `co2=${air_data[0]};tvoc=${air_data[1]};h2=${hum_data[0]};eth=${hum_data[1]};`;
      send_data(payload);
    });
  });
}


/* RN2483 reset function - calling this function should print something
like "RN2483 1.0.4 Oct 12 2017 14:59:25" */
function resetRn2483(){
  pinMode(E13, "output");
  digitalWrite(E13, 1);
  digitalPulse(E13, 0, 200);
}

/* This is the callback called when character appears on the serial port */
Serial3.on('data', function(data) {
  serialRxData = serialRxData + data;
  if(serialRxData.indexOf("\r\n") != -1) {
    switch(state) {
      case "reset":
        if (serialRxData.indexOf("RN2483") != -1) {
          console.log("Node is joining the Lora Network...");
          sendToRn2483("mac join otaa");
          state = "init_rn2483";
        }
        break;
      case "init_rn2483":
        if (serialRxData.indexOf("accepted") != -1) {
          console.log("Node successfully connected to Lora Network");
          console.log("Waiting for sensor to be ready before starting first measure");
          // init sgp30
          state = "iddle";
          I2C3.writeTo(SGP30_ADDRESS, 0x20, 0x03);
          setTimeout(() => {
            console.log("Sensor is ready to start measures");
            // call of air_mesure outside interval to avoid waiting before first call
            start_mesures();
            setInterval(start_mesures, MEASURES_INTERVAL);
          }, 15000);
        }
        break;
      case "sending":
        if (serialRxData.indexOf("mac_tx_ok") != -1) {
          console.log("Data sent\n");
          state = "iddle";
        }
        break;
      default:
        break;
    }

    console.log(serialRxData);
    serialRxData = "";
  }
});

/* Send a string to RN2483 with the syntax "sendToRn2483("COMMAND_TO_SEND")".
The <CR><LF> characters are automatically added by the Serial3.println() function
See https://ww1.microchip.com/downloads/en/DeviceDoc/40001784B.pdf for full
command reference */
function sendToRn2483(string) {
  console.log("Command sent: "+ string);
  Serial3.println(string);
}

/* The onInit() function is called at board reset */
function onInit() {
  console.log("========== Program started ==========\r\n");
  state = "reset";
  resetRn2483();
  digitalWrite(E12, 1);
}

/* General function writing a specific register through I2C */
function i2c_write_reg(address, register, value) {
  let msb_reg, lsb_reg, msb_val, lsb_val;
  const split_reg = split_from_16_to_8_bits(register);
  const split_val = split_from_16_to_8_bits(value);
  const crc = get_crc(split_val);

  I2C3.writeTo(address, split_reg[0], split_reg[1], split_val[0], split_val[1], crc);
}

/* General function reading several registers in a row through I2C */
function i2c_burst_read(address, register, burst, wait_before_read, callback) {
  const split_reg = split_from_16_to_8_bits(register);
  I2C3.writeTo(address, split_reg[0], split_reg[1]);
  setTimeout(() => {
    let data = I2C3.readFrom(address, burst);
    let val1 = from_8_bits_to_16(data[0], data[1]);
    let val2 = null;

    // if 2 values returned
    if (data.length === 6) {
      val2 = from_8_bits_to_16(data[3], data[4]);
    }

    // todo: check data crc
    callback([val1, val2]);
  }, wait_before_read);
}

function from_8_bits_to_16(msb, lsb) {
  return (msb << 8) + lsb;
}

function split_from_16_to_8_bits(data) {
  var msb = (data & 0xff00) >> 8;
  var lsb = data & 0xff;

  return [msb, lsb];
}

function get_crc(data) {
  var crc = 0xff; //init value
  for(cur_byte = 0; cur_byte < data.length; cur_byte++){
    crc = (crc ^ (data[cur_byte])) & 0xff;
    for (crc_bit = 8; crc_bit > 0; --crc_bit) {
              if (crc & 0x80)
                  crc = ((crc << 1) ^ CRC8_POLYNOMIAL) & 0xff;
              else
                  crc = (crc << 1) & 0xff;
    }
  }
  return crc;
}

function is_crc_ok(data, checksum){
  var crc = get_crc(data);
  //print("crc val : " +  crc);// for debug
  if(crc == checksum)
    return true;
  else
    return false;
}


/* This instruction is needed to save the script in the MCU flash memory */
save();
