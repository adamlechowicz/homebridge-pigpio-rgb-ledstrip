"use strict";

var Service, Characteristic;

const pigpio = require('pigpio-client').pigpio();
const converter = require('color-convert');

const ready = new Promise((resolve, reject) => {
  pigpio.once('connected', resolve);
  pigpio.once('error', reject);
});

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory('homebridge-pigpio-rgb-ledstrip', 'SmartLedStrip', SmartLedStripAccessory);
}

function SmartLedStripAccessory(log, config) {
  this.log      = log;
  this.name     = config['name'];

  this.rPin     = config['rPin'];
  this.gPin     = config['gPin'];
  this.bPin     = config['bPin'];

  this.currentR   = 0;
  this.currentG   = 0;
  this.currentB   = 0;

  this.enabled = true;

  try {
    if (!this.rPin)
      throw new Error("rPin not set!")
    if (!this.gPin)
      throw new Error("gPin not set!")
    if (!this.bPin)
      throw new Error("bPin not set!")
  } catch (err) {
    this.log("An error has been thrown! " + err);
    this.log("homebridge-pigpio-rgb-ledstrip won't work until you fix this problem");
    this.enabled = false;
  }

  ready.then(async (info) => {
    // initialize GPIO pins for LEDs
    this.rLed = pigpio.gpio(this.rPin);
    this.gLed = pigpio.gpio(this.gPin);
    this.bLed = pigpio.gpio(this.bPin);
   
  }).catch(console.error);

}

SmartLedStripAccessory.prototype = {

  getServices : function(){

    if(this.enabled){
      let informationService = new Service.AccessoryInformation();

      informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Adam Lechowicz')
      .setCharacteristic(Characteristic.Model, 'PiGPIO-RGB-LedStrip')
      .setCharacteristic(Characteristic.SerialNumber, '05-05-18');

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

      this.log("SmartLEDStrip has been successfully initialized!");

      return [informationService, smartLedStripService];
    }else{
      this.log("SmartLEDStrip has not been initialized, please check your logs..");
      return [];
    }

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
    if(this.enabled){
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
    }
  },

  updateRGB : function(red, green, blue)
  {
      let curR = this.currentR;
      let curG = this.currentG;
      let curB = this.currentB;
      this.log("Setting RGB values to: Red: "+red + " Green: "+green+ " Blue: "+blue);
      while(curR !== red || curG !== green || curB !== blue) {
        curR = (red !== curR) ? ((red - curR < 0) ? curR - 1 : curR + 1) : curR;
        curG = (green !== curG) ? ((green - curG < 0) ? curG - 1 : curG + 1) : curG;
        curB = (blue !== curB) ? ((blue - curB < 0) ? curB - 1 : curB + 1) : curB;
        this.rLed.analogWrite(red);
        this.gLed.analogWrite(green);
        this.bLed.analogWrite(blue);
      }
  }

}
