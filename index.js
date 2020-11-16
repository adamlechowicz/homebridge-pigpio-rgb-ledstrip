"use strict";

var Service, Characteristic;

const piblaster = require('pi-blaster.js');
const converter = require('color-convert');
const fs = require('fs');

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory('homebridge-gpio-rgb-ledstrip', 'SmartLedStrip', SmartLedStripAccessory);
}

function SmartLedStripAccessory(log, config) {
  this.log      = log;
  this.name     = config['name'];

  this.rPin     = config['rPin'];
  this.gPin     = config['gPin'];
  this.bPin     = config['bPin'];

  if (!this.rPin) {
    this.log("You must provide a config value for redPin. Default one will be used: 22");
    this.rPin = 22;
  }
  if (!this.gPin) {
    this.log("You must provide a config value for greenPin. Default one will be used: 17");
    this.gPin = 17;
  } 
  if (!this.bPin) {
    this.log("You must provide a config value for bluePin. Default one will be used: 27");
    this.bPin = 27;
  }
  if (!fs.statSync('/dev/pi-blaster').isFIFO())
  {
    this.log("/dev/pi-blaster is not a FIFO list. There's something wrong with your pi-blaster instance!");
    this.log("homebridge-gpio-rgb-ledstrip won't work untill you fix this problem");
  }
}

SmartLedStripAccessory.prototype = {

  getServices : function(){

    let informationService = new Service.AccessoryInformation();

    informationService
    .setCharacteristic(Characteristic.Manufacturer, 'Manfredi Pistone')
    .setCharacteristic(Characteristic.Model, 'Homebridge RGB LedStrip')
    .setCharacteristic(Characteristic.SerialNumber, '06-06-00');

    let smartLedStripService = new Service.Lightbulb(this.name);

    smartLedStripService
        .getCharacteristic(Characteristic.On)
        .on('change',this.toggleState.bind(this));

    smartLedStripService
        .addCharacteristic(new Characteristic.Brightness())
        .on('change',this.toggleState.bind(this));

    smartLedStripService
        .addCharacteristic(new Characteristic.Hue())
        .on('change',this.toggleState.bind(this));

    smartLedStripService
        .addCharacteristic(new Characteristic.Saturation())
        .on('change',this.toggleState.bind(this));

    this.informationService = informationService;
    this.smartLedStripService = smartLedStripService;

    this.log('Homebridge RGB LedStrip Initialized');

    return [informationService, smartLedStripService];
  },

  isOn : function() {
      return this.smartLedStripService.getCharacteristic(Characteristic.On).value;
  },

  getBrightness : function(){
    return this.smartLedStripService.getCharacteristic(Characteristic.Brightness).value;
  },

  getHue : function(){
    return this.smartLedStripService.getCharacteristic(Characteristic.Hue).value;
  },

  getSaturation : function(){
    return this.smartLedStripService.getCharacteristic(Characteristic.Saturation).value;
  },

  toggleState : function()
  {
      if(!this.isOn())
      {
          this.updateRGB(0,0,0);
          return;
      }

      var brightness = this.getBrightness();
      if(brightness!=0){
          var rgb = converter.hsv.rgb([this.getHue(), this.getSaturation(), brightness]);
          this.updateRGB(rgb[0], rgb[1], rgb[2]);
      }else{
          this.updateRGB(0,0,0);
      }
  },

  updateRGB : function(red, green, blue)
  {
      this.log("Setting rgb values to: Red: "+red + " Green: "+green+ " Blue: "+blue);
      piblaster.setPwm(this.rPin, red/255);
      piblaster.setPwm(this.gPin, green/255);
      piblaster.setPwm(this.bPin, blue/255);
  }

}
