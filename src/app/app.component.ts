import { Component, OnInit } from '@angular/core';
import { Paho } from 'ng2-mqtt';

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs/Observable';

import { ConfigService } from '../config/config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

@Injectable()
export class AppComponent implements OnInit {
  title = 'Angular MQTT';
  status = 'Disconnected';
  messages: String[];
  private _client: Paho.MQTT.Client;
  config: any;


  public constructor(private http: HttpClient, private configService: ConfigService) {
    this.messages = new Array<String>();
    this.configService.getConfig().subscribe(
      data => {
        console.log(data)
        //Get configuration properties from config.json
        this.config = data;
      },
      error => {
        console.log(error)
      }
    )
  }

  connect() {
    //if the value of clientId is the default, add random number
    if (this.config.clientId.includes("clientIdAngular")) {
      this.config.clientId = "clientIdAngular_" + ((Math.random() * 10000) | 0);
    }
    console.log("try connection: " + this.config.hostname + ":" + this.config.port + " - clientId=" + this.config.clientId);
    try {
      //creation Paho MQTT Client
      this._client = new Paho.MQTT.Client(this.config.hostname, Number(this.config.port), "/mqtt", this.config.clientId);
    } catch (e) {
      console.log(e);
      this.status = "Error on creation of client MQTT: " + e.message;
    }

    //callback in case of connection lost
    this._client.onConnectionLost = (responseObject: any) => {
      this.status = (responseObject.errorCode == 0) ? "The disconnect has been successful" : "Disconnected: " + responseObject.errorMessage;
      console.log('Connection lost: ' + responseObject.errorMessage);
    };

    //callback for incoming messagges
    this._client.onMessageArrived = (message: Paho.MQTT.Message) => {
      console.log('Message arrived: ' + message.payloadString);
      this.messages.push(message.destinationName + ' | Payload:' + message.payloadString)
    };

    //callback for outgoing messagges
    this._client.onMessageDelivered = () => {
      this.status = 'Connected (Publish message to ' + this.config.topicStringPub + ' : ' + this.config.topicStringPubMessage + ')';
      console.log("Publish to " + this.config.topicStringPub + ": " + this.config.topicStringPubMessage);
    };

    //the options used in the connection phase
    var options = {
      userName: this.config.username,
      password: this.config.password,
      useSSL: this.config.useSSL,
      cleanSession: this.config.cleanSession,
      keepAliveInterval: Number(this.config.keepAlive),
      mqttVersion: 3,
      timeout: 3,
      //Gets Called if the connection has successfully been established
      onSuccess: (responseObject: Object) => {
        console.log('Connected to broker.');
        this.status = "Connected";
      },
      onFailure: (responseObject: any) => {
        this.status = "Connection failed: " + responseObject.errorMessage;
      }
    };
    try {
      this._client.connect(options);
    } catch (e) {
      console.log(e);
      this.status = "Error on connect: " + e.message;
    }
  }

  disconnect() {
    try {
      this._client.disconnect();
    } catch (e) {
      console.log(e);
      this.status = "Error on disconnect: " + e.message;
    }
  }

  publish() {
    try {
      //creation of a Paho MQTT Message object with params
      let message = new Paho.MQTT.Message(this.config.topicStringPubMessage);
      message.destinationName = this.config.topicStringPub;
      message.qos = Number(this.config.QoSPub);
      message.retained = this.config.retained;
      this._client.send(message)
    } catch (e) {
      console.log(e);
      this.status = "Error on publish: " + e.message;
    }
  }

  subscribe() {
    try {
      this._client.subscribe(this.config.topicStringSub, {
        qos: Number(this.config.QoSSub),
        onSuccess: (responseObject: Object) => {
          this.status = 'Connected (Subscribed to ' + this.config.topicStringSub + ')';
          console.log("Subscribed to " + this.config.topicStringSub);
        },
        onFailure: (errorObject: Object) => {
          this.status = "Error on subscription";
        }
      });
    } catch (e) {
      console.log(e);
      this.status = "Error on subscription: " + e.message;
    }
  }

  unsubscribe() {
    try {
      this._client.unsubscribe(this.config.topicStringSub, {
        onSuccess: (responseObject: any) => {
          this.status = 'Connected (Unsubscribe gone successfully)';
          console.log("Unsubscribe gone successfully");
        },
      });
    } catch (e) {
      console.log(e);
      this.status = "Error on unsubscribe: " + e.message;
    }
  }

  ngOnInit() {
  }
}