import io from "socket.io-client";
import $ from "jquery";

$(function () {
  const socket = io();
  const $messageForm = $("#messageForm");
  const $message = $("#message");
  const $chat = $("#chat");

  $messageForm.submit((event) => {
    event.preventDefault();
    if ($message.val().length > 0) {
      socket.emit("send message", $message.val(), (user) => {
        console.log("dung");
        $chat.append(
          `<div><span  class="badge badge-primary">Admin</span> : ${user} correct !!!</div>`
        );
      });
      $message.val("");
    }
  });
  socket.on("send message", (data) => {
    $chat.append(
      data.user === "Admin"
        ? `<div><span  class="badge badge-primary">${data.user}</span> : ${data.message}</div>`
        : `<div><span class="badge badge-secondary">${data.user}</span> : ${data.message}</div>`
    );
  });

  const $userForm = $("#userForm");
  const $user = $("#user");

  $userForm.submit((event) => {
    event.preventDefault();
    socket.emit("login", $user.val(), ({ success, err }) => {
      if (success) {
        $("#userFormArea").hide();
        $("#roomFormArea").show();
      } else if (err) {
        alert(err);
      }
    });
    $user.val("");
  });
  socket.on("get user", (data) => {
    let html = "";
    for (let i = 0; i < data.length; i++) {
      html += `<li class="list-group-item">${data[i]}</li>`;
    }
    $("#users").html(html);
  });

  $createForm = $("#createForm");
  $room = $("#room-create");

  $createForm.submit((event) => {
    event.preventDefault();
    socket.emit("create", $room.val(), ({ success, err }) => {
      if (success) {
        $("#roomFormArea").hide();
        $("#messageFormArea").show();
      } else if (err) {
        alert(err);
      }
    });
  });
  function update() {
    const listRoomm = document.getElementsByClassName("room");
    console.log(listRoomm.length);
  }
  socket.on("get room", (rooms) => {
    let html = "";
    for (let i = 0; i < rooms.length; i++) {
      html += `<div class="list-group-item room" data-name=${rooms[i].name}>${rooms[i].name}<br/>Players: ${rooms[i].listMember.length}/8</div>`;
    }
    $("#rooms").html(html);
    $(document).on("click", ".room", (event) => {
      console.log("clicked!!!");
      socket.emit(
        "join room",
        event.target.dataset.name,
        ({ success, err }) => {
          if (success) {
            $("#roomFormArea").hide();
            $("#messageFormArea").show();
          } else if (err) {
            alert(err);
          }
        }
      );
    });
  });
  socket.on("get member", (members) => {
    let html = "";
    for (let i = 0; i < members.length; i++) {
      html += `<li class="list-group-item drawing">${members[i]} <span id="score"> Score : 0</li>`;
    }
    $("#members").html(html);
  });

  //! Draw
  $word = $("#word");
  $("#start").click((event) => {
    event.preventDefault();
    socket.emit("start", socket.id);
  });
  let color = "#000000";
  let width = 3;
  socket.on("playing", ({ room, id }) => {
    let isDrawing = id;

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    ctx.lineCap = "round";
    ctx.lineWidth = width;

    let colorChange = document.getElementById("color");
    colorChange.addEventListener("change", (event) => {
      color = colorChange.value;
      ctx.strokeStyle = color;
    });
    let widthChange = document.getElementById("width");
    widthChange.addEventListener("change", (event) => {
      width = widthChange.value;
      ctx.lineWidth = width;
    });

    if (socket.id === isDrawing) {
      socket.on("word", (word) => {
        $("#word").html(word);
      });

      setInterval(() => {
        $message.val("");
      }, 0);

      let drawing = false;
      let prevX = 0;
      let prevY = 0;
      let currX = 0;
      let currY = 0;
      let rect = canvas.getBoundingClientRect();

      canvas.addEventListener("mousemove", (e) => {
        if (!drawing) return;
        prevX = currX;
        prevY = currY;
        currX = e.clientX - rect.left;
        currY = e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(currX, currY);
        socket.emit("draw", {
          room,
          x: currX,
          y: currY,
          color: color,
          width: width,
        });
        ctx.stroke();
        ctx.closePath();
      });

      canvas.addEventListener("mousedown", (e) => {
        drawing = true;
        currX = e.clientX - rect.left;
        currY = e.clientY - rect.top;
      });
      window.addEventListener("mouseup", () => {
        drawing = false;
        socket.emit("draw", {
          room,
          x: 0,
          y: 0,
          color: color,
          width: width,
        });
      });
      $("#clear").click(() => {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      });
    } else {
      socket.on(
        "word",
        (word) => {
          let html = ".";
          for (let i = 0; i < word.length; i++) {
            html += "__.";
          }
          $("#word").html(html);
        },
        () => {
          socket.emit("send message", $message);
        }
      );

      let prevX = 0;
      let prevY = 0;
      let currX = 0;
      let currY = 0;
      socket.on("draw", ({ x, y, color, width }) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        if (currX === 0 && currY === 0 && x !== 0 && y !== 0) {
          prevX = x;
          prevY = y;
        } else {
          prevX = currX;
          prevY = currY;
        }
        currX = x;
        currY = y;
        if (currX === 0 && currY === 0) return;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(currX, currY);
        ctx.stroke();
        //ctx.closePath();
      });
    }
  });

  socket.on("start", (data) => {
    $chat.append(
      data.user === "Admin"
        ? `<div><span  class="badge badge-primary">${data.user}</span> : ${data.message}</div>`
        : `<div><span class="badge badge-secondary">${data.user}</span> : ${data.message}</div>`
    );
    $("#start").hide();
    $("#word").show();
  });
});
