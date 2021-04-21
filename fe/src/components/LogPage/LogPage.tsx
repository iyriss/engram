import './LogPage.scss';

import {
  Divider,
  Fade,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  SvgIcon,
} from '@material-ui/core';
import { MoreVert as MoreVertIcon } from '@material-ui/icons';
import moment from 'moment';
import querystring from 'query-string';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import { DateHeader } from '../DateHeader/DateHeader';
import { ReactComponent as EventIcon } from '../icons/EventIcon.svg';
import { ReactComponent as NoteIcon } from '../icons/NoteIcon.svg';
import { ReactComponent as TaskCompletedIcon } from '../icons/TaskCompletedIcon.svg';
import { ReactComponent as TaskIcon } from '../icons/TaskIcon.svg';
import { Markdown } from '../Markdown/Markdown';
import * as NotesApi from '../notes/NotesApi';
import TextBox from '../textbox/TextBox';

type LogPageProps = {
  date?: Date;
  onDateChanged?: (date: Date) => void;
};

export const LogPage: React.FC<LogPageProps> = (props) => {
  const location = useLocation();
  const [textBoxFocused, setTextBoxFocused] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<NotesApi.Note | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [notes, setNotes] = useState<NotesApi.Note[]>([]);
  const [menuAnchoEl, setMenuAnchorEl] = React.useState<null | HTMLDivElement>(
    null
  );

  useEffect(() => {
    async function fetchNotes() {
      if (props.date) {
        const fetchedNotes = await NotesApi.getNotes({
          since: moment(props.date).startOf("d").toDate(),
          before: moment(props.date).startOf("d").toDate(),
        });
        setNotes(fetchedNotes);
      } else {
        setNotes([]);
      }
    }
    fetchNotes();
  }, [props.date]);

  const handleSubmit = async (note: NotesApi.Note) => {
    const date = props.date || new Date();
    const noteWithDate = {
      ...note,
      date: moment(date).format("YYYY-MM-DD"),
    };

    setTextBoxFocused(false);
    if (noteToEdit) {
      await handleNoteUpdated({
        ...noteToEdit,
        ...noteWithDate,
      });
      setNoteToEdit(null);
    } else {
      const createdNote = await NotesApi.createNote(noteWithDate);
      setNotes([...notes, createdNote]);
    }
    setTextBoxFocused(true);
  };

  const { query } = querystring.parseUrl(location.search);
  const { body, text, url, title } = query;

  let initialBody = body as string;

  if (noteToEdit) {
    initialBody = noteToEdit.body || "";
  } else if (title && url) {
    initialBody = `[${title}](${url})`;
  } else if (text) {
    initialBody = text as string;
  }

  const initialType = noteToEdit ? noteToEdit.type : "note";

  async function handleNoteUpdated(noteToUpdate: NotesApi.Note) {
    const updatedNote = await NotesApi.updateNote({
      ...noteToUpdate,
    });
    const notesCopy = [...notes];
    const index = notesCopy.findIndex(
      (note) => note.localId === updatedNote.localId
    );
    notesCopy.splice(index, 1, updatedNote);
    setNotes(notesCopy);
  }

  const handleMoreClicked = (note: NotesApi.Note, event: any) => {
    setSelectedNoteId(note.localId || "");
    setMenuAnchorEl(event.target as any);
  };

  function getNoteById(localId: string) {
    return notes.find((note) => note.localId === localId);
  }

  function handleShareClicked() {
    hideMenu();
    const note = getNoteById(selectedNoteId);
    if (note && navigator) {
      navigator.share({
        text: note.body,
      });
    }
  }

  async function handleRemoveClicked() {
    hideMenu();
    await NotesApi.removeNote(selectedNoteId);
    const noteIndex = notes.findIndex(
      (note) => note.localId === selectedNoteId
    );
    const notesCopy = [...notes];
    notesCopy.splice(noteIndex, 1);
    setNotes(notesCopy);
  }

  function hideMenu() {
    setMenuAnchorEl(null);
  }

  function handleEditNote() {
    const note = getNoteById(selectedNoteId);
    if (!note) {
      return;
    }

    setTextBoxFocused(false);
    setNoteToEdit(note);
    setImmediate(() => {
      setTextBoxFocused(true);
    });
  }

  const types: NotesApi.NoteType[] = [
    "note",
    "task",
    "task_completed",
    "event",
  ];
  async function handleToggleType(note: NotesApi.Note) {
    const currentTypeIndex = types.indexOf(note.type || "note");
    let nextTypeIndex = (currentTypeIndex + 1) % types.length;
    await handleNoteUpdated({
      ...note,
      type: types[nextTypeIndex],
    });
  }

  function getNoteIcon(note: NotesApi.Note) {
    const type = note.type || "note";

    const iconByType = {
      note: NoteIcon,
      task: TaskIcon,
      task_completed: TaskCompletedIcon,
      event: EventIcon,
    };

    return <SvgIcon component={(iconByType as any)[type]}></SvgIcon>;
  }

  function handleDateChanged(date: Date) {
    if (props.onDateChanged) {
      props.onDateChanged(date);
    }
  }

  const isShareEnabled = Boolean(navigator.share);

  return (
    <>
      {props.date ? (
        <DateHeader
          date={props.date}
          dateRangeValue="Day"
          onDateChange={handleDateChanged}
        />
      ) : null}
      <div className="log-page">
        <div className="log-page__content">
          <div className="log-page__notes-container">
            <div className="log-page__notes">
              <List disablePadding={true} dense={true}>
                {notes.map((note) => {
                  return (
                    <div key={note.localId}>
                      <Divider />
                      <ListItem>
                        <ListItemIcon>
                          <IconButton
                            edge="start"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleType(note);
                            }}
                          >
                            {getNoteIcon(note)}
                          </IconButton>
                        </ListItemIcon>
                        <ListItemText>
                          <Markdown body={note.body || ""} />
                        </ListItemText>
                        <ListItemIcon>
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMoreClicked(note, e);
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </ListItemIcon>
                      </ListItem>
                    </div>
                  );
                })}
              </List>
              <Menu
                id="fade-menu"
                anchorEl={menuAnchoEl}
                keepMounted
                open={Boolean(menuAnchoEl)}
                onClose={setMenuAnchorEl.bind(this, null)}
                TransitionComponent={Fade}
              >
                <MenuItem onClick={handleEditNote}>Edit</MenuItem>
                {isShareEnabled ? (
                  <MenuItem onClick={handleShareClicked}>Share...</MenuItem>
                ) : null}
                <MenuItem onClick={handleRemoveClicked}>Remove</MenuItem>
              </Menu>
            </div>
          </div>
        </div>
        <div className="log-page__footer">
          <div className="log-page__textBox">
            <TextBox
              initialBody={initialBody}
              initialType={initialType || "note"}
              focused={textBoxFocused}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </>
  );
};