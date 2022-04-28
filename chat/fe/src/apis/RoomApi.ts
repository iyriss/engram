import { io } from 'socket.io-client';

import { sendNotification } from '../services/NotificationService';
import { TextUtils } from '../utils/TextUtils';
import { httpGet } from './Api';
import { getSelf, getUser } from './UserApi';
import { UserRoomConfig } from './UserRoomConfigApi';

type MessageListener = (message: MessageType) => any;

const messageListenerByRoomId: { [id: string]: MessageListener } = {};
const deleteMessageListenerByRoomId: { [id: string]: () => any } = {};

export type Room = {
  _id: string;
  name: string;
  userRoomConfig?: UserRoomConfig;
};

export async function initializeRoomApi() {
  await getRooms();

  const socket = io();

  socket.on('message', (message: MessageType) => {
    const room = roomsById[message.room];
    if (!room) {
      // User doesn't have access to the room
      // TODO: make sure websocket only sends to relevant parties
      return;
    }

    const currentUser = getSelf();
    const messageSender = getUser(message.user);
    console.log('message', message);
    if (message.user !== currentUser._id)
      sendNotification({
        title: room.name,
        body: `${messageSender.name}: ${TextUtils.truncate(message.body, 256)}`,
      });

    const roomId = message.room;

    // console.log('messagesByRoomID', messagesByRoomID);
    // console.log('message', message);
    // console.log('messageListenerByRoomId', messageListenerByRoomId);

    if (1) {
    }
    console.log('messageListenerByRoomId', messageListenerByRoomId);
    if (messagesByRoomID[roomId]) {
      messagesByRoomID[roomId].unshift(message);

      if (messageListenerByRoomId[roomId]) {
        messageListenerByRoomId[roomId](message);
        console.log('message', message);

        console.log(
          'messageListenerByRoomId[roomId]',
          messageListenerByRoomId[roomId]
        );
      }
    }
  });

  socket.on('delete-message', ({ room, user }) => {
    // const roomId = room;
    // const currentUser = getSelf();
    // const messageSender = getUser(message.user);

    // if (message.user !== currentUser._id)
    console.log('messagesByRoomID ~~~~', user);
    // console.log('message', message);
    // console.log('messageListenerByRoomId', messageListenerByRoomId);
    deleteMessageListenerByRoomId[room]();
  });

  //   socket.on('delete-message', ({ id, room }) => {
  //     alert('aaaaler');
  //     console.log('x', id, room);
  //     if (messagesByRoomID[room]) {
  //       messagesByRoomID[room].shift();
  //       // onRoomMessage
  //       onDeleteRoomMessage
  //       // if (messageListenerByRoomId[roomId]) {
  //       //   messageListenerByRoomId[roomId](message);
  //       //   console.log('message', message);

  //       //   console.log(
  //       //     'messageListenerByRoomId[roomId]',
  //       //     messageListenerByRoomId[roomId]
  //       //   );
  //       // }
  //     }
  //   });
}

const roomsById: { [key: string]: Room } = {};

type GetRoomsResponse = {
  data: Room[];
};

export async function getRooms() {
  const res = await fetch('/api/rooms');
  const jsonData: GetRoomsResponse = await res.json();

  const rooms = jsonData.data;
  for (const room of rooms) {
    roomsById[room._id] = room;
  }

  return jsonData.data;
}

export function getRoom(roomId) {
  return roomsById[roomId];
}

export type MessageType = {
  _id: string;
  user: string;
  body: string;
  room: string;
  createdAt: Date;
};

const messagesByRoomID: { [id: string]: MessageType[] } = {};

type GetRoomMessagesData = {
  messages: MessageType[];
  userRoomConfig: {
    lastReadMessageId: string;
  };
};

export async function getRoomMessages(roomId: string) {
  const data = await httpGet<GetRoomMessagesData>(
    `/api/rooms/${roomId}/messages`
  );
  messagesByRoomID[roomId] = data.messages;
  return {
    messages: messagesByRoomID[roomId],
    userRoomConfig: data.userRoomConfig,
  };
}

type SendRoomMessageParams = {
  room: string;
  body: string;
};

export async function sendRoomMessage(params: SendRoomMessageParams) {
  fetch(`/api/rooms/${params.room}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: params.body }),
  });
}

type DeleteRoomMessageParams = {
  id: string;
  room: string;
};

export async function deleteRoomMessage(params: DeleteRoomMessageParams) {
  fetch(`/api/rooms/${params.room}/messages`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: params.id,
    }),
  });
}

export async function onRoomMessage(
  roomId: string,
  handler: (message: MessageType) => any
) {
  console.log('on room message', handler);
  messageListenerByRoomId[roomId] = handler;
}

export async function onDeleteMessage(roomId: string, handler: () => any) {
  console.log('handler in delete', handler);
  deleteMessageListenerByRoomId[roomId] = handler;
}
