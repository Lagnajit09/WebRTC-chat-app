import React, { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext();

const socket = io("http://localhost:5000");

const ContextProvider = ({ children }) => {
  const [stream, setStream] = useState();
  const [me, setMe] = useState("");
  const [call, setCall] = useState({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });
    // const getUserMedia = async () => {
    //   try {
    //     const currentStream = await navigator.mediaDevices.getUserMedia({
    //       video: true,
    //       audio: true,
    //     });
    //     setStream(currentStream);
    //     console.log(myVideo);
    //     console.log(myVideo.current);
    //     if (myVideo.current) {
    //       myVideo.current.srcObject = currentStream;
    //     }
    //   } catch (error) {
    //     console.log(error);
    //   }
    // };
    // getUserMedia();

    socket.on("me", (id) => setMe(id));
    socket.on("calluser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });
  }, []);

  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (data) => {
      socket.emit("answercall", { signal: data, to: call.from });
    });

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(call.signal);

    connectionRef.current = peer;
  };

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (data) => {
      socket.emit("calluser", {
        userToCall: id,
        signalData: data,
        from: me,
        name,
      });
    });

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    socket.on("callaccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();

    window.location.reload();
  };

  return (
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        callEnded,
        me,
        callUser,
        leaveCall,
        answerCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };

function explanation() {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((currentStream) => {
      setStream(currentStream);
      myVideo.current.srcObject = currentStream;
    });
  // This part of the code requests access to the user's media devices (typically a webcam and microphone) using the getUserMedia function.
  // Imagine this as asking the user for permission to use their camera and microphone, just like when a website asks for access to your camera and microphone for video calls.
  // Once the user grants permission, the function returns a Promise that resolves with the user's media stream (currentStream).
  // The setStream function updates the state variable stream with the received media stream, making it available for use in the application.
  // Finally, the received media stream is assigned to the srcObject property of the myVideo DOM element. This allows the user to see their own video stream in a video element (<video>), referenced by the myVideo ref.

  socket.on("me", (id) => setMe(id));
  socket.on("calluser", ({ from, name: callerName, signal }) => {
    setCall({ isReceivingCall: true, from, name: callerName, signal });
  });
  //   Here, the code sets up event listeners to handle specific events emitted by the server via Socket.IO.
  // When the server emits a "me" event, it sends the user's own socket ID (id). The callback function sets the me state variable with this ID.
  // This is like when you receive a call, and your phone shows your own phone number as the caller ID.
  // When the server emits a "calluser" event, it sends information about an incoming call, including the caller's ID (from), caller's name (callerName), and signaling data (signal).
  // This is similar to receiving a call notification on your phone, which includes the caller's name and number.
  // Upon receiving the call notification, the setCall function updates the call state variable with the relevant information, indicating that the user is receiving a call (isReceivingCall: true).

  //-----------summary--------------------
  //   Okay so in this part we are requesting user to access his mic and camera. Then sets the access i.e. the currentStream to a state variable as well as to a video element srcObject. Then when the server emits a 'me' event the client listens to it and stores my socketID in a state variable. Then when an user calls me, the server emits a 'calluser' to 'userToCall'(in this case it is my ID) and in the frontend the socket.on('calluser'...) event gets triggered and sets the call state variable with the required details.
  // -------------------------------------

  const peer = new Peer({ initiator: false, trickle: false, stream });
  // The new Peer() constructor in WebRTC creates a Peer object, which represents a connection between two peers (users) in a WebRTC application. This object is used to manage the peer-to-peer communication, including signaling, negotiating, and streaming audio/video data between the peers.

  peer.on("signal", (data) => {
    socket.emit("answercall", { signal: data, to: call.from });
  });
  //   Who emits the signal event?
  // The peer object emits the signal event internally when it receives signaling data from the remote peer. It's not directly triggered by peer.emit("signal") in the application code. Instead, the WebRTC library internally handles this event when signaling data is received.

  peer.on("stream", (currentStream) => {
    userVideo.current.srcObject = currentStream;
  });
  //   Who emits the stream event?
  // the stream event is emitted internally by the WebRTC library (e.g., simple-peer in this case) when a media stream is received from the remote peer. It's not explicitly emitted by your application code; instead, it's part of the underlying WebRTC functionality provided by the library.

  connectionRef.current = peer;
  // The statement connectionRef.current = peer; assigns the peer object to the current property of a connectionRef reference. This allows the application to store a reference to the peer object, making it accessible for later use.
}
