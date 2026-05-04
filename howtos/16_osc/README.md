# using open sound control with seagulls
Open Sound Control (OSC) is a networking protocol often used in the digital arts. It is most often sent using the User Datagram Protocol (UDP); importantly, UDP messages cannot be directly read by the browser. 

For this demo, we have a node.js server that runs and delivers our `index.html` file at the address [`http://127.0.0.1:8080/howtos/16_osc`](http://127.0.0.1:8080/howtos/16_osc). While the web server listens on port 8080, a UDP server is setup that is listening on port 57121. When the OSC UDP messages are received by the server, it forwards them to our webpage using the WebSocket protocol, a realtime communication protocol well-supported in browsers. So, basically the server acts as a translation layer to go from UDP -> WebSockets, so that we can read the messages using JavaScript.

## getting this working
First, I'd recommend downloading and installing [Protokol](https://hexler.net/protokol), which will enable you to monitor incoming OSC messages. It's available on mac/win/lin and free. Once you have Protokol downloaded and running, click on the OSC tab. Set you port to be `57121`, and then check the `Enabled` check box. You should see a message that says something like `CONNECT | ENDPOINT(0.0.0.:57121)`; this means Protokol is ready to monitor messages!

Next, download an app that sends OSC to your phone. Some options include [TouchOSC](https://hexler.net/touchosc) (iOS or Android, $5 or $19.99 for the fancy version) or oscHook (Android, free), or [Sensors2OSC(Android,free)](https://sensors2.org/osc/) or [Data OSC](https://apps.apple.com/us/app/data-osc/id6447833736). Both TouchOSC and Data OSC are highly recommended. If you find other free apps for Android that you like, please let me know!

Find out the IP address of the computer running Protokol. In Linux you can do this using `hostname -I`, in macOS you can use `ifconfig -a`, and in windows you can enter `ipconfig` into the command prompt. You want one that will look something like `192.168.1.13`. Enter this IP address into the OSC app on your phone, and also specify the output port (aka send port) as `57121`.

If you send some messages now, you should see them in Protokol! If you don't see some messages, here are some things to try:

1. Make sure the firewall for your computer is disabled, or, alternatively, open up port 57121.
2. Campus wifi permissions can make this tricky. I usually have the best luck connecting my laptop to my phone as a hotspot... then you know they're on the same network and you won't have any ports being blocked.
3. If you're using TouchOSC (the new version) and have Protokol open / enabled, you can hit the `browse` button in the OSC panel to automatically find and connect to your computer. This is definitely the easiest option.
4. ONLY ONE APPLICATION CAN CLAIM PORT 57121 AT ANY TIME. Make sure you're not trying to run both the server in this folder and Protokol on port 57121. This is an easy mistake to make if you're going back and forth testing different things.

If you see messages in Protokol, you're almost there!

## hooking up your app to this howto
The JavaScript in the `index.html` listens for three messages: `/fader1`, `/fader2`, and `/fader3`. You can change these to match what your mobile OSC app outputs OR, in the case of a configurable app like TouchOSC, you can specify what address each widget outputs to. 

Make sure you uncheck the "Enabled" checkbox in Protokol if you have it open. Open the command line in this howto folder and type `npm install express ws osc-min`. This will install the necessary dependencies for the server; the other two are available by default in node.js. Once these three libraries are installed, start the server with `node index.mjs`.

In the browser, navigate to `http://127.0.0.1:8080/howtos/16_osc`. Move whatever widgets you've assigned to the `/fader1` address. Hopefully you have victory!
