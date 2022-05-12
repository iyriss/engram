import autolinker from 'autolinker';

import {
  getRoom,
  getRoomMessages,
  MessageType,
  onRoomMessage,
  sendRoomMessage,
  deleteRoomMessage,
  onDeleteMessage,
  editRoomMessage,
  onEditMessage,
} from '../apis/RoomApi';

import { RoomList } from './RoomList';

import { getSelf, getUser } from '../apis/UserApi';
import { Button } from '../components/Button';
import { Div } from '../components/Div';
import { Span } from '../components/Span';
import { Input } from '../components/Input';
import { TextArea } from '../components/TextArea'
import { Routes } from '../routes/Routes';
import { Borders } from '../theme/Borders';
import {
  bottomPosition,
  byId,
  bySelector,
  onClick,
  onMouseLeave,
  onMouseOver,
  setStyle,
  setText,
} from '../utils/DomUtils';
import { setURL } from '../utils/HistoryUtils';

type RoomViewProps = {
  roomId: string;
};

let sideBarEnabled = false;

export function RoomView(props: RoomViewProps) {
  let messages: MessageType[] = [];
  let userRoomConfig: {
    lastReadMessageId: string;
  } = null;
  let messageButtonActive = false;

  sideBarEnabled = localStorage.getItem('sidebar') === 'true';


  const roomView = Div({
    class: 'room-view',
  });
  setStyle(roomView, {
    display: 'flex',
    flexGrow: '1',
    width: '100%',
  })


  const messageView = Div({
    class: 'message-view',
  });

  setStyle(messageView, {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 50px)',
    width: '100%',
    flexGrow: '1',
    minWidth: '0',
  });

  const room = getRoom(props.roomId);

  onRoomMessage(props.roomId, (message) => {
    if (isLastMessageToday(messages[1], message)) {
      messageList.prepend(DateDivider(message.createdAt));
    }
    const newMessage = Message(message);
    messageList.prepend(newMessage);
  });

  onDeleteMessage(props.roomId, async (messageId) => {
    const messageToDelete = byId(messageId);
    messageToDelete.remove();
    const isLastMessageInList =
      messageList.firstElementChild.classList.contains('date-divider');

    if (isLastMessageInList) {
      messageList.removeChild(messageList.firstChild);
      const messagesList = await getRoomMessages(props.roomId);
      messages = messagesList.messages;
    }
  });

  onEditMessage(props.roomId, async (message) => {
    const messageToEdit = byId(message._id);
    messageToEdit.getElementsByClassName('body')[0].innerHTML = autolinker.link(message.body);
  });

  function Message(props: MessageType) {
    let dropdownOpen = false;

    const el = Div({
      class: 'message',
      id: props._id,
    });

    setStyle(el, {
      display: 'flex',
      margin: '4px 0px',
      overflowWrap: 'Anywhere',
      padding: '0px 15px'
    });

    onMouseOver(el, (e) => {
      e.stopPropagation();
      if (messageButtonActive) {
        return;
      }

      el.style.backgroundColor = '#f2f2f2';
      const optionsButton = bySelector(el.lastElementChild, '.options-button');
      if (optionsButton) {
        optionsButton.style.display = 'block';
      }
    });

    onMouseLeave(el, (e) => {
      e.stopPropagation();
      if (messageButtonActive) {
        return;
      }
      el.style.backgroundColor = '';
      const optionsButton = bySelector(el.lastElementChild, '.options-button');
      if (optionsButton) {
        optionsButton.style.display = dropdownOpen ? 'block' : 'none';
      }
    });

    const user = getUser(props.user);

    const userIcon = Div();
    setStyle(userIcon, {
      display: 'flex',
      flexShrink: '0',
      justifyContent: 'center',
      alignItems: 'center',
      fontWeight: 'bold',
      borderRadius: '999px',
      height: '30px',
      width: '30px',
      backgroundColor: user.color || 'black',
      color: 'white',
      textAlign: 'center',
      lineHeight: '30px',
      marginRight: '10px',
      fontSize: '12px',
    });

    const firstInitial = user.name.charAt(0);
    const lastInitial = user.name.split(' ')[1].charAt(0);

    userIcon.innerText = firstInitial + lastInitial;
    el.append(userIcon);

    const messageContentEl = Div();
    setStyle(messageContentEl, {
      width: '100%',
    });
    el.append(messageContentEl);

    async function init() {
      const userNameEl = Span();
      setStyle(userNameEl, {
        fontWeight: 'bold',
      });

      setText(userNameEl, user.name);
      messageContentEl.append(userNameEl);

      const messageTime = Span();
      setStyle(messageTime, {
        marginLeft: '8px',
        fontSize: '12px',
      });

      const messageCreatedAt = new Date(props.createdAt).toLocaleTimeString(
        'en',
        { hour: 'numeric', minute: '2-digit' }
      );

      messageTime.innerHTML = messageCreatedAt;
      messageContentEl.append(messageTime);

      const bodyEl = Div();
      bodyEl.className = 'body';
      setStyle(bodyEl, {
        position: 'relative',
        whiteSpace: 'pre-wrap',
      });

      bodyEl.innerHTML = autolinker.link(props.body);

      const currentUser = getSelf();
      if (props.user === currentUser._id) {
        const messageOptions = Div({
          class: 'options-button',
        });
        setStyle(messageOptions, {
          position: 'absolute',
          top: '-18px',
          right: '0px',
          display: 'none',
          cursor: 'pointer',
          width: '24px',
          height: '12px',
          paddingBottom: '10px',
          textAlign: 'center',
          fontSize: '14px',
          border: '1px solid #909090bf',
          backgroundColor: '#f2f2f2',
          color: '#909090',
          borderRadius: '2px',
        });

        messageOptions.innerHTML = '&#8230';
        bodyEl.append(messageOptions);

        onMouseOver(messageOptions, () => {
          messageOptions.style.borderColor = '#909090';
        });
        onMouseLeave(messageOptions, () => {
          messageOptions.style.borderColor = '#909090bf';
        });

        onClick(messageOptions, () => {
          dropdownOpen = !dropdownOpen;
          messageButtonActive = !messageButtonActive;

          const element = byId(props._id);
          const optionsButton = bySelector(element, '.options-button');

          if (bottomPosition(optionsButton) > window.innerHeight - 100) {
            dropdown.style.top = '-38px';
            dropdown.style.zIndex = '1';
          }
          dropdown.style.display = dropdownOpen ? 'block' : 'none';
        });

        const dropdown = Div();
        setStyle(dropdown, {
          display: 'none',
          position: 'absolute',
          top: '24px',
          right: '0',
          cursor: 'pointer',
          border: '1px solid #909090',
          color: '#333',
          backgroundColor: '#fff',
          borderRadius: '2px',
        });

        const options = document.createElement('ul');
        setStyle(options, {
          listStyleType: 'none',
          padding: '0px',
          margin: '0px',
        });

        const delete_option = document.createElement('li');
        setStyle(delete_option, {
          margin: '0',
          padding: '8px 12px',
          overflowWrap: 'Normal',
        });
        delete_option.innerHTML = 'Delete';


        const edit_option = document.createElement('li');
        setStyle(edit_option, {
          margin: '0',
          padding: '8px 12px',
          overflowWrap: 'Normal',
        });
        edit_option.innerHTML = 'Edit';

        options.appendChild(delete_option);
        options.appendChild(edit_option);

        onClick(delete_option, () => {
          handleDeleteMessage(props._id);
          messageButtonActive = false;
        });
        onMouseOver(delete_option, () => {
          delete_option.style.backgroundColor = '#f2f2f2';
          dropdown.style.border = '1px solid #909090';
        });
        onMouseLeave(delete_option, () => {
          delete_option.style.backgroundColor = '';
          dropdown.style.border = '1px solid #909090bf';
        });

        onClick(edit_option, () => {
          const editedMessage = prompt("Edit your message:");
          handleEditMessage(props._id, editedMessage);
          messageButtonActive = false;
        });
        onMouseOver(edit_option, () => {
          edit_option.style.backgroundColor = '#f2f2f2';
          dropdown.style.border = '1px solid #909090';
        });
        onMouseLeave(edit_option, () => {
          edit_option.style.backgroundColor = '';
          dropdown.style.border = '1px solid #909090bf';
        });

        function handleClickOutsideDropdown(e) {
          e.stopPropagation();
          const element = byId(props._id);
          if (
            dropdownOpen &&
            !bySelector(element, '.options-button').contains(
              e.target as Element
            )
          ) {
            dropdownOpen = !dropdownOpen;
            messageButtonActive = false;
            dropdown.style.display = 'none';
            messageOptions.style.display = 'none';
            el.style.backgroundColor = '';
          }
        }

        window.addEventListener('click', handleClickOutsideDropdown);

        dropdown.append(options);
        messageOptions.append(dropdown);
      }
      messageContentEl.append(bodyEl);
    }

    init();

    return el;
  }

  function MessageList() {
    const el = Div();

    setStyle(el, {
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column-reverse',
      margin: '0',
      width: '100%',

    });

    async function init() {
      const messagesList = await getRoomMessages(props.roomId);
      messages = messagesList.messages;
      userRoomConfig = messagesList.userRoomConfig;

      for (let i = 0; i < messages.length; i++) {
        if (messages[i]._id === userRoomConfig.lastReadMessageId) {
          el.append(NewRow());
        }
        el.appendChild(Message(messages[i]));

        const message = new Date(messages[i].createdAt).toLocaleDateString();
        const nextMessage = messages[i + 1]
          ? new Date(messages[i + 1].createdAt).toLocaleDateString()
          : null;

        if (message !== nextMessage) {
          el.append(DateDivider(messages[i].createdAt));
        }
      }
    }

    init();

    return el;
  }

  function NewRow() {
    const el = Div();
    setStyle(el, {
      borderBottom: '1px solid red',
    });
    return el;
  }

  function DateDivider(dividerDate: Date) {
    const messagesDate = Div({
      class: 'date-divider',
    });
    setStyle(messagesDate, {
      display: 'flex',
      position: 'relative',
    });

    const dateBox = Div();
    setStyle(dateBox, {
      background: '#fff',
      marginLeft: 'auto',
      marginRight: 'auto',
      padding: '8px',
      fontSize: '12px',
      zIndex: '1',
    });

    dateBox.innerHTML = new Date(dividerDate).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    messagesDate.append(dateBox);

    const messagesDateHr = Div();
    setStyle(messagesDateHr, {
      position: 'absolute',
      bottom: '50%',
      width: '100%',
      border: 'none',
      borderTop: '1px solid #ddd',
      opacity: '0.5',
      boxSizing: 'border-box',
    });

    messagesDate.append(messagesDateHr);
    return messagesDate;
  }

  function isLastMessageToday(
    lastListMessage: MessageType,
    currentMessage: MessageType
  ) {
    if (!lastListMessage) {
      return true;
    }

    const dateLastListMessage = new Date(
      lastListMessage.createdAt
    ).toLocaleDateString();
    const dateCurrentMessage = new Date(
      currentMessage.createdAt
    ).toLocaleDateString();

    return dateLastListMessage !== dateCurrentMessage;
  }

  function TextBox(props: { onSubmit: (text: string) => void }) {
    const el = Div({
      // class: 'textbox',
    });
    setStyle(el, {
      flexShrink: '0',
      maxHeight: '25%',
      minHeight: '6%',
      marginTop: 'auto',
      display: 'flex',
      padding: '0 15px',
      paddingBottom: '15px',
    });

    const originalHeight = el.style.height;

    const input = TextArea();
    setStyle(input, {
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      resize: 'none',
      overflow: 'auto',
      marginRight: '5px',
      padding: '0',
    })

    const btnSubmit = Button({
      text: '>',
    })
    setStyle(btnSubmit, {
      maxHeight: '45px',
      width: '30px',
    })
    onClick(btnSubmit, () => {
      const inputText = input.value.trim();
      props.onSubmit(inputText);
      input.value = '';
      el.style.height = originalHeight;
    })

    input.addEventListener('keydown', (e) => {
      const scrollHeight = input.scrollHeight;
      if (scrollHeight > Number(originalHeight)) {
        el.style.height = String(scrollHeight);
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        const inputText = input.value.trim();
        e.preventDefault();
        props.onSubmit(inputText);
        input.value = '';
        el.style.height = originalHeight;
      }
    });

    el.appendChild(input);
    el.appendChild(btnSubmit);

    setTimeout(() => {
      input.focus();
    }, 0);

    return el;
  }

  function RoomHeader() {
    const el = Div({
      class: 'room-header'
    });

    setStyle(el, {
      display: 'flex',
      borderBottom: Borders.bottom,
      padding: '8px',
      width: '100%',
      margin: '0 auto',
    });

    const btnBack = Button({
      text: '<',
    });
    el.append(btnBack);
    onClick(btnBack, () => {
      setURL(Routes.home);
    });

    const btnSidebar = Button({
      text: 'Toggle Sidebar'
    });
    setStyle(btnSidebar, {
      marginLeft: '10px',
    })
    el.append(btnSidebar);

    onClick(btnSidebar, () => {
      toggleSidebar();
      localStorage.getItem('sidebar') === 'true' ?
        document.getElementById('sidebar').style.width = "200px" :
        document.getElementById('sidebar').style.width = "0px";
    })

    const roomNameEl = Div({
      class: 'room-name-el'
    });

    setStyle(roomNameEl, {
      paddingLeft: '8px',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      paddingRight: '20px',
    });
    setText(roomNameEl, room.name);

    el.append(roomNameEl);

    return el;
  }

  function SideBar() {
    const el = Div({
      id: 'sidebar'
    });
    setStyle(el, {
      flexShrink: '0',
      flexGrow: '0',
      width: '0px',
      maxWidth: '33.33%'
    })
    if (localStorage.getItem('sidebar') === 'true') {
      el.style.width = '200px';
    }

    const roomList = RoomList();
    setStyle(roomList, {
      flexShrink: '0',
    })
    el.append(roomList);
    return el;
  }

  function toggleSidebar() {
    sideBarEnabled = !sideBarEnabled;

    localStorage.setItem('sidebar', sideBarEnabled ? 'true' : 'false');
  }


  roomView.append(SideBar());
  roomView.append(messageView);

  const roomHeader = RoomHeader();
  messageView.append(roomHeader);

  const messageList = MessageList();

  function handleSubmit(text: string) {
    sendRoomMessage({
      room: props.roomId,
      body: text,
    });
  }

  function handleDeleteMessage(id: string) {
    deleteRoomMessage({
      room: props.roomId,
      id: id,
    });
  }

  function handleEditMessage(id: string, newText: string) {
    editRoomMessage({
      room: props.roomId,
      id: id,
      body: newText,
    })
  }

  const textBox = TextBox({ onSubmit: handleSubmit });

  messageView.appendChild(messageList);
  messageView.appendChild(textBox);

  return roomView;
}
