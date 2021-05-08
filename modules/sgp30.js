const SGP30_ADDRESS = 0x58;
const CRC8_POLYNOMIAL = 0x31;
const FIRST_MEASURE_WAIT = 15000;

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

  return crc == checksum;
}

function split_from_16_to_8_bits(data) {
  var msb = (data & 0xff00) >> 8;
  var lsb = data & 0xff;

  return [msb, lsb];
}

function from_8_bits_to_16(msb, lsb) {
  return (msb << 8) + lsb;
}

function SGP30(i2c, options) {
  options = options||{};
  options.addr = options.addr||SGP30_ADDRESS;
  this.need_to_wait = true;
  sgp30 = this;
  setTimeout(() => sgp30.need_to_wait = false, FIRST_MEASURE_WAIT);
  
  this.w = (reg, data) => {
    const split_reg = split_from_16_to_8_bits(reg);
    const split_val = split_from_16_to_8_bits(data);
    const crc = get_crc(split_val);

    i2c.writeTo(options.addr, split_reg[0], split_reg[1], split_val[0], split_val[1], crc)
  };
  this.r = (reg, len, wait) => {
    const split_reg = split_from_16_to_8_bits(reg);
    i2c.writeTo(options.addr, split_reg[0], split_reg[1]);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        var data = i2c.readFrom(options.addr, len);
        var val1 = from_8_bits_to_16(data[0], data[1]);
        var val2 = null;

        if(!is_crc_ok([data[0], data[1]], data[2])) {
          reject(new Error("Invalid crc"));
        }
  
        if (data.length === 6) {
          val2 = from_8_bits_to_16(data[3], data[4]);
          if(!is_crc_ok([data[3], data[4]], data[5])) {
            reject(new Error("Invalid crc"))
          }
        }
  
        resolve([val1, val2]);
      }, wait)
    });
  };
}

SGP30.prototype.get_sensor_data = function() {
  var sgp30 = this;
  return new Promise((resolve, reject) => {
    var data = {}
    var timeout = 0;
    if (sgp30.need_to_wait) {
      // wait 15 seconds before first measure
      timeout = FIRST_MEASURE_WAIT;
      console.log("is_first measure");
      sgp30.need_to_wait = false;
    }
    setTimeout(() => {
      sgp30.r(0x2008, 6, 12)
      .then(air_data => {
        data.co2 = air_data[0];
        data.tvoc = air_data[1];
      })
      .then(() => sgp30.r(0x2050, 6, 25))
      .then(hum_data => {
        data.h2 = hum_data[0];
        data.eth = hum_data[1];
        resolve(data);
      })
      .catch(reject);
    }, timeout);
  })
}

exports = SGP30;