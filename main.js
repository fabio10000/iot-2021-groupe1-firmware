/* RN2483 must be plugged in slot #2 !!! */

/* See https://download.mikroe.com/documents/starter-boards/clicker-2/stm32f4/clicker2-stm32-manual-v100.pdf
for board full schematic and pins assignment */

var serialRxData = "";

/* Serial port initialisation (the "/25*8" is a work-around because of bad
internal clock initialisation) */
Serial3.setup(57600/25*8, { tx:D8, rx:D9 });

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
  resetRn2483();
}

/* This instruction is needed to save the script in the MCU flash memory */
save();
