import { useEffect, useRef, useState } from 'react';
import {
  Bell, CalendarDays, Check, ChevronRight, Clock3, Heart, Home,
  ImagePlus, Leaf, Lightbulb, Menu, MessageCircle, Pencil, Plus, Send, Sparkles,
  Trash2, Users, X, BookHeart, Pill, ShieldCheck, Smile, Sun, Upload,
} from 'lucide-react';

const today = new Date();
const dateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
};
const fmtDate = (date, options = { weekday: 'long', month: 'long', day: 'numeric' }) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialData = {
  name: 'Margaret',
  events: [
    { id: 'event-demo', title: 'Dr. Patel — annual check-up', date: addDays(1), time: '10:00', location: 'Riverside Family Practice', notes: 'Bring appointment documents and question list.', checklist: 'Bring appointment documents', questions: 'Ask about my latest check-up results' },
    { id: 'event-lunch', title: 'Lunch with Susan', date: addDays(3), time: '12:30', location: 'Willow Café', notes: 'A nice chance to catch up.', checklist: '', questions: '' },
  ],
  family: [
    { id: 'family-demo', name: 'Emma', relationship: 'Granddaughter', birthday: addDays(3), note: 'Loves drawing and the color purple.', photo: '' },
    { id: 'family-susan', name: 'Susan', relationship: 'Daughter', birthday: '', note: 'Call on Sunday afternoons.', photo: '' },
  ],
  reminders: [
    { id: 'med-demo', title: 'Morning medication', kind: 'Medication', time: '08:00', frequency: 'Every day', date: dateKey(today), acknowledged: false, note: 'Schedule entered by Margaret based on healthcare professional instructions.' },
    { id: 'call-demo', title: 'Call Susan', kind: 'Everyday', time: '16:00', frequency: 'Once', date: dateKey(today), acknowledged: false, note: 'A little hello is always lovely.' },
  ],
  interests: ['Gardening', 'Reading', 'Bird watching'],
  memories: [
    { id: 'memory-demo', title: 'Emma’s first school play', date: addDays(-14), text: 'She stood so proudly on stage. We had hot chocolate afterward.', photo: '' },
  ],
  chats: [],
};

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'family', label: 'My Family', icon: Users },
  { id: 'schedule', label: 'My Schedule', icon: CalendarDays },
  { id: 'reminders', label: 'My Reminders', icon: Bell },
  { id: 'interests', label: 'My Interests', icon: Leaf },
  { id: 'companion', label: 'AI Companion', icon: MessageCircle },
  { id: 'memories', label: 'My Memories', icon: BookHeart },
];

function useLocalData() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('everassist-data');
      return saved ? { ...initialData, ...JSON.parse(saved) } : initialData;
    } catch (error) {
      console.error('Could not read EverAssist data from this browser.', error);
      return initialData;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('everassist-data', JSON.stringify(data));
    } catch (error) {
      console.error('Could not save EverAssist data to this browser.', error);
      window.dispatchEvent(new Event('everassist-storage-error'));
    }
  }, [data]);
  return [data, setData];
}

function App() {
  const [data, setData] = useLocalData();
  const [page, setPage] = useState('home');
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const notifiedReminders = useRef(new Set());

  const announce = (message) => {
    setToast(message);
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => setToast(''), 3500);
  };
  useEffect(() => {
    const showStorageError = () => setToast('Your changes could not be saved. Try removing a large photo or freeing browser storage.');
    window.addEventListener('everassist-storage-error', showStorageError);
    return () => window.removeEventListener('everassist-storage-error', showStorageError);
  }, []);
  const update = (key, value) => setData((current) => ({ ...current, [key]: value }));
  const go = (id) => {
    setPage(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      announce('This browser does not support notifications. Reminders remain available here.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifications(permission === 'granted');
    announce(permission === 'granted' ? 'Notifications are turned on for this browser.' : 'Notifications were not enabled. You can still see reminders here.');
  };

  useEffect(() => {
    const tick = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const notifyOnce = (key, title, body) => {
        if (notifiedReminders.current.has(key)) return;
        notifiedReminders.current.add(key);
        new Notification(title, { body });
      };
      data.reminders.filter((r) => reminderOccursOn(r, dateKey(now)) && !isReminderAcknowledged(r, dateKey(now)) && r.time === time)
        .forEach((r) => {
          const occurrence = `${r.id}-${dateKey(now)}-${time}`;
          notifyOnce(occurrence, `EverAssist reminder: ${r.title}`, 'Tap EverAssist to view or acknowledge this reminder.');
        });
      if (time === '09:00') {
        data.events.filter((event) => event.date === addDays(1))
          .forEach((event) => notifyOnce(`appointment-${event.id}-${event.date}`, 'Appointment tomorrow', `${event.title} at ${formatTime(event.time)}. Open My Schedule to review your preparation.`));
        data.family.filter((person) => daysUntilBirthday(person.birthday) === 3)
          .forEach((person) => notifyOnce(`birthday-${person.id}-${nextBirthdayDate(person.birthday)}`, 'A birthday is coming up', `${person.name}’s birthday is in three days. Would you like to prepare a message?`));
      }
    };
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, [data.reminders]);

  const todayEvents = data.events.filter((event) => event.date === dateKey(today)).sort((a, b) => a.time.localeCompare(b.time));
  const todayReminders = data.reminders.filter((item) => reminderOccursOn(item, dateKey(today)))
    .map((item) => ({ ...item, acknowledged: isReminderAcknowledged(item, dateKey(today)) }))
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = data.events.filter((event) => event.date >= dateKey(today)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const upcomingBirthdays = data.family.map((person) => ({ ...person, days: daysUntilBirthday(person.birthday) }))
    .filter((person) => person.days !== null && person.days <= 7).sort((a, b) => a.days - b.days);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Heart size={25} fill="currentColor" /></div><div><strong>EverAssist</strong><span>Your gentle companion</span></div></div>
        <div className="side-label">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${page === id ? 'active' : ''}`} onClick={() => go(id)} aria-current={page === id ? 'page' : undefined}>
              <Icon size={21} strokeWidth={2} /><span>{label}</span>{page === id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card"><ShieldCheck size={19} /><div><strong>Your information stays yours</strong><p>Saved privately on this device.</p></div></div>
          <button className="profile-button" onClick={() => { const name = window.prompt('What name would you like EverAssist to use?', data.name); if (name?.trim()) { update('name', name.trim().slice(0, 40)); announce('Your name has been updated.'); } }}><div className="avatar">{data.name.slice(0, 1).toUpperCase()}</div><div><strong>{data.name}</strong><span>My profile</span></div><ChevronRight size={18} /></button>
        </div>
      </aside>
      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={23} /></button>
          <div className="breadcrumb">Your space <span>/</span> {navItems.find((item) => item.id === page)?.label}</div>
          <div className="top-actions"><span className="today-label"><Sun size={18} /> A lovely day to be you</span><button className="notification-button" onClick={requestNotifications}><Bell size={18} /> <span>{notifications ? 'Notifications on' : 'Set up reminders'}</span></button></div>
        </header>
        <div className="content">
          {page === 'home' && <HomePage data={data} go={go} events={todayEvents} reminders={todayReminders} birthdays={upcomingBirthdays} upcoming={upcoming} announce={announce} onAcknowledge={(item) => update('reminders', data.reminders.map((r) => r.id === item.id ? setReminderAcknowledged(r, dateKey(today), !item.acknowledged) : r))} />}
          {page === 'family' && <FamilyPage people={data.family} update={(v) => update('family', v)} announce={announce} />}
          {page === 'schedule' && <SchedulePage events={data.events} update={(v) => update('events', v)} announce={announce} />}
          {page === 'reminders' && <RemindersPage reminders={data.reminders} update={(v) => update('reminders', v)} announce={announce} onRequestNotifications={requestNotifications} />}
          {page === 'interests' && <InterestsPage interests={data.interests} update={(v) => update('interests', v)} announce={announce} />}
          {page === 'companion' && <CompanionPage data={data} update={(key, value) => update(key, value)} announce={announce} />}
          {page === 'memories' && <MemoriesPage memories={data.memories} update={(v) => update('memories', v)} announce={announce} />}
          <footer className="footer-note"><ShieldCheck size={16} /> Your privacy matters. Your information is stored on this device.</footer>
        </div>
      </main>
      {toast && <div className="toast" role="status"><Check size={19} />{toast}</div>}
    </div>
  );
}

function daysUntilBirthday(date) {
  if (!date) return null;
  const now = new Date(); const birthday = new Date(`${date}T12:00:00`);
  const next = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate(), 12);
  if (dateKey(next) < dateKey(now)) next.setFullYear(now.getFullYear() + 1);
  return Math.round((new Date(dateKey(next)).getTime() - new Date(dateKey(now)).getTime()) / 86400000);
}
function parseLocalDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
function reminderOccursOn(reminder, date) {
  if (date < reminder.date) return false;
  if (reminder.frequency === 'Every day') return true;
  if (reminder.frequency === 'Weekdays') {
    const weekday = parseLocalDate(date).getDay();
    return weekday !== 0 && weekday !== 6;
  }
  if (reminder.frequency === 'Weekly') return parseLocalDate(date).getDay() === parseLocalDate(reminder.date).getDay();
  return date === reminder.date;
}
function isReminderAcknowledged(reminder, date) {
  return reminder.acknowledgedDates?.includes(date) || (reminder.acknowledged && reminder.frequency === 'Once' && reminder.date === date);
}
function setReminderAcknowledged(reminder, date, acknowledged) {
  const acknowledgedDates = new Set(reminder.acknowledgedDates || []);
  if (acknowledged) acknowledgedDates.add(date);
  else acknowledgedDates.delete(date);
  return { ...reminder, acknowledged: reminder.frequency === 'Once' && reminder.date === date ? acknowledged : false, acknowledgedDates: [...acknowledgedDates] };
}
function nextReminderDate(reminder, from = dateKey(today)) {
  for (let offset = 0; offset < 370; offset += 1) {
    const date = dateKey(new Date(parseLocalDate(from).getTime() + offset * 86400000));
    if (reminderOccursOn(reminder, date) && !isReminderAcknowledged(reminder, date)) return date;
  }
  return null;
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section>; }
function SectionTitle({ icon: Icon, title, action }) {
  return <div className="section-title"><div className="section-title-name"><span className="section-icon"><Icon size={19} /></span><h2>{title}</h2></div>{action}</div>;
}
function EmptyState({ text }) { return <div className="empty-state"><span>☀</span><p>{text}</p></div>; }

function HomePage({ data, go, events, reminders, birthdays, upcoming, announce, onAcknowledge }) {
  const dayName = today.toLocaleDateString(undefined, { weekday: 'long' });
  const tomorrowEvent = upcoming.find((event) => event.date === addDays(1));
  return <>
    <div className="hero">
      <div className="hero-content"><div className="hero-date"><Sun size={17} /> {fmtDate(dateKey(today))}</div><h1>Good morning, {data.name}<span className="wave"> ☀</span></h1>
        <p>Let’s take today one gentle step at a time. You’re right where you need to be.</p>
        <button className="button button-primary hero-button" onClick={() => go('companion')}><Sparkles size={19} /> What should I do today?</button>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="sun-disc" /><div className="hill hill-back" /><div className="hill hill-front" /><span className="art-flower flower-one">✿</span><span className="art-flower flower-two">✿</span><span className="art-leaf">✦</span></div>
      <div className="hero-corner"><span>YOUR DAY, AT YOUR PACE</span></div>
    </div>
    <div className="daily-summary"><div className="summary-icon"><Sparkles size={20} /></div><div><strong>Your gentle daily briefing</strong><p>{birthdays.length ? `${birthdays[0].name}’s birthday is ${birthdays[0].days === 0 ? 'today' : `in ${birthdays[0].days} days`}. ` : ''}{tomorrowEvent ? `You have ${tomorrowEvent.title} tomorrow. ` : ''}Your day is taking shape—there’s room to enjoy a little gardening, too.</p></div><span className="sample-pill">SAMPLE</span></div>
    <div className="dashboard-grid">
      <Card><SectionTitle icon={CalendarDays} title={`${dayName} at a glance`} action={<button className="text-button" onClick={() => go('schedule')}>Full schedule <ChevronRight size={16} /></button>} />
        {events.length ? <div className="timeline">{events.map((event) => <div className="timeline-item" key={event.id}><div className="timeline-time">{formatTime(event.time)}</div><div className="timeline-dot" /><div className="timeline-copy"><strong>{event.title}</strong><span>{event.location || 'Details to be added'}</span></div></div>)}</div> : <EmptyState text="A peaceful day ahead. Add an event whenever you like." />}
      </Card>
      <Card><SectionTitle icon={Bell} title="A few helpful reminders" action={<button className="text-button" onClick={() => go('reminders')}>See all <ChevronRight size={16} /></button>} />
        {reminders.length ? <div className="reminder-list">{reminders.map((item) => <div className={`reminder-row ${item.acknowledged ? 'is-done' : ''}`} key={item.id}><span className={`reminder-symbol ${item.kind === 'Medication' ? 'med-symbol' : ''}`}>{item.kind === 'Medication' ? <Pill size={18} /> : <Clock3 size={18} />}</span><div className="reminder-copy"><strong>{item.title}</strong><span>{formatTime(item.time)} · {item.kind}</span></div><button className={`check-button ${item.acknowledged ? 'checked' : ''}`} aria-label={`${item.acknowledged ? 'Unmark' : 'Acknowledge'} ${item.title}`} onClick={() => { onAcknowledge(item); announce(item.acknowledged ? 'Reminder marked as not yet done.' : 'Reminder acknowledged. Well done.'); }}><Check size={17} /></button></div>)}</div> : <EmptyState text="No reminders for today. Enjoy the extra space." />}
      </Card>
    </div>
    <div className="dashboard-grid lower-grid">
      <Card><SectionTitle icon={Heart} title="Little moments to look forward to" action={<button className="text-button" onClick={() => go('family')}>My family <ChevronRight size={16} /></button>} />
        {birthdays.length ? birthdays.map((person) => <div className="birthday-callout" key={person.id}><div className="birthday-avatar">{person.photo ? <img src={person.photo} alt="" /> : '🎂'}</div><div><strong>{person.name}’s birthday {person.days === 0 ? 'is today!' : `is in ${person.days} days`}</strong><span>{person.relationship} · {person.note || 'A lovely reason to celebrate'}</span><button className="inline-link" onClick={() => go('companion')}>Prepare a birthday message <ChevronRight size={15} /></button></div></div>) : <EmptyState text="Add a family birthday to see it here." />}
      </Card>
      <Card><SectionTitle icon={Leaf} title="A gentle idea for today" /><div className="idea-card"><div className="idea-illustration">🌱</div><div><span className="idea-label">A LITTLE TIME FOR YOU</span><h3>Spend a few minutes in the garden</h3><p>Water a favorite plant or simply enjoy the fresh air. There’s no rush.</p><button className="inline-link" onClick={() => go('interests')}>Explore your interests <ChevronRight size={15} /></button></div></div></Card>
    </div>
    <div className="sample-note"><ShieldCheck size={16} /> Demonstration profile: names and activities shown are sample information, saved only in this browser.</div>
  </>;
}

function formatTime(time) {
  if (!time) return 'Time not set';
  const [hour, minute] = time.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function useForm(initial, onSave) {
  const [form, setForm] = useState(initial);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const input = (label, key, props = {}) => <label className="field">{label}<input value={form[key] || ''} onChange={set(key)} {...props} /></label>;
  const textarea = (label, key, props = {}) => <label className="field">{label}<textarea value={form[key] || ''} onChange={set(key)} rows="3" {...props} /></label>;
  const submit = (event) => { event.preventDefault(); onSave(form); };
  return { form, setForm, set, input, textarea, submit };
}
function FormActions({ onCancel, editing }) {
  return <div className="form-actions"><button className="button button-primary" type="submit">{editing ? 'Save changes' : 'Save'}</button><button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button></div>;
}
function EditControls({ onEdit, onDelete }) {
  return <div className="item-actions"><button className="icon-button" aria-label="Edit" onClick={onEdit}><Pencil size={17} /></button><button className="icon-button delete-button" aria-label="Delete" onClick={onDelete}><Trash2 size={17} /></button></div>;
}

function FamilyPage({ people, update, announce }) {
  const empty = { name: '', relationship: '', birthday: '', note: '', photo: '' };
  const [editing, setEditing] = useState(null); const [showForm, setShowForm] = useState(false);
  const form = useForm(editing || empty, (value) => {
    if (!value.name.trim()) return;
    update(editing ? people.map((p) => p.id === editing.id ? { ...value, id: p.id } : p) : [...people, { ...value, id: makeId() }]);
    setShowForm(false); setEditing(null); announce(editing ? 'Family details updated.' : `${value.name} added to your family.`);
  });
  const startEdit = (person) => { setEditing(person); form.setForm(person); setShowForm(true); };
  const fileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { announce('Please choose an image file.'); return; }
    if (file.size > 3 * 1024 * 1024) { announce('Please choose an image smaller than 3 MB.'); return; }
    const reader = new FileReader(); reader.onload = () => form.setForm((current) => ({ ...current, photo: reader.result })); reader.readAsDataURL(file);
  };
  return <><PageHeading eyebrow="THE PEOPLE WHO MAKE YOUR DAYS BRIGHTER" title="My Family" description="Keep the little details and important dates close to heart." action={<button className="button button-primary" onClick={() => { setEditing(null); form.setForm(empty); setShowForm(!showForm); }}><Plus size={19} /> Add family member</button>} />
    <Card className="section-card"><SectionTitle icon={Users} title="Your special people" /><div className="family-grid">{people.map((person) => {
      const days = daysUntilBirthday(person.birthday);
      return <article className="family-card" key={person.id}><div className="family-photo">{person.photo ? <img src={person.photo} alt={`${person.name}`} /> : <span>{person.name.slice(0, 1).toUpperCase()}</span>}<EditControls onEdit={() => startEdit(person)} onDelete={() => { update(people.filter((p) => p.id !== person.id)); announce(`${person.name} removed from your family list.`); }} /></div><div className="family-info"><span className="relationship">{person.relationship || 'Family'}</span><h3>{person.name}</h3>{person.birthday && <p className="family-date"><CalendarDays size={15} /> Birthday · {fmtDate(person.birthday, { month: 'long', day: 'numeric' })}</p>}{person.note && <p className="family-note">{person.note}</p>}{days !== null && days <= 7 && <div className="birthday-badge">🎈 {days === 0 ? 'Birthday today!' : `Birthday in ${days} days`}</div>}</div></article>;
    })}{!people.length && <EmptyState text="Your family memories start with the people you love." />}</div></Card>
    {showForm && <Card className="form-card"><SectionTitle icon={editing ? Pencil : Plus} title={editing ? 'Edit family member' : 'Add someone special'} /><form onSubmit={form.submit}><div className="form-grid">{form.input('Name *', 'name', { required: true, autoFocus: true })}{form.input('Relationship', 'relationship', { placeholder: 'e.g. Granddaughter' })}{form.input('Birthday', 'birthday', { type: 'date' })}{form.textarea('A little note', 'note', { placeholder: 'What would you like to remember?' })}</div><label className="field upload-field">Photo (optional)<span className="upload-box"><Upload size={19} /> Choose a family photo<input type="file" accept="image/*" onChange={fileChange} /></span>{form.form.photo && <img className="upload-preview" src={form.form.photo} alt="Selected family photo preview" />}</label><FormActions editing={!!editing} onCancel={() => { setShowForm(false); setEditing(null); }} /></form></Card>}
    <div className="info-banner"><Heart size={19} /><p><strong>A birthday reminder, just in time.</strong> We’ll show family birthdays here when they’re within a week. You can choose whether to enable browser notifications.</p></div>
  </>;
}

function SchedulePage({ events, update, announce }) {
  const empty = { title: '', date: dateKey(today), time: '10:00', location: '', notes: '', checklist: '', questions: '' };
  const [editing, setEditing] = useState(null); const [showForm, setShowForm] = useState(false);
  const form = useForm(editing || empty, (value) => {
    if (!value.title.trim() || !value.date) return;
    update(editing ? events.map((e) => e.id === editing.id ? { ...value, id: e.id } : e) : [...events, { ...value, id: makeId() }]);
    setShowForm(false); setEditing(null); announce(editing ? 'Appointment updated.' : 'Appointment added to your schedule.');
  });
  const sorted = [...events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return <><PageHeading eyebrow="A LITTLE ORDER, A LOT MORE EASE" title="My Schedule" description="Appointments, plans, and the things you’re looking forward to." action={<button className="button button-primary" onClick={() => { setEditing(null); form.setForm(empty); setShowForm(!showForm); }}><Plus size={19} /> Add appointment</button>} />
    <Card className="section-card"><SectionTitle icon={CalendarDays} title="Your appointments" /><div className="schedule-list">{sorted.map((event) => <article className="schedule-item" key={event.id}><div className="schedule-date"><span>{fmtDate(event.date, { month: 'short' }).toUpperCase()}</span><strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong></div><div className="schedule-details"><span className="time-label"><Clock3 size={15} /> {formatTime(event.time)}</span><h3>{event.title}</h3>{event.location && <p>{event.location}</p>}{event.notes && <p className="schedule-note">{event.notes}</p>}{(event.checklist || event.questions) && <details className="appointment-details"><summary>Preparation & questions</summary>{event.checklist && <p><strong>Bring:</strong> {event.checklist}</p>}{event.questions && <p><strong>Ask:</strong> {event.questions}</p>}</details>}</div><EditControls onEdit={() => { setEditing(event); form.setForm(event); setShowForm(true); }} onDelete={() => { update(events.filter((e) => e.id !== event.id)); announce('Appointment removed from your schedule.'); }} /></article>)}{!sorted.length && <EmptyState text="No appointments on the calendar. Add a plan whenever you like." />}</div></Card>
    {showForm && <Card className="form-card"><SectionTitle icon={editing ? Pencil : Plus} title={editing ? 'Edit appointment' : 'Add an appointment'} /><form onSubmit={form.submit}><div className="form-grid">{form.input('Appointment *', 'title', { required: true, autoFocus: true })}{form.input('Date *', 'date', { type: 'date', required: true })}{form.input('Time', 'time', { type: 'time' })}{form.input('Location', 'location', { placeholder: 'Clinic, address, or meeting place' })}{form.textarea('Notes', 'notes', { placeholder: 'Anything you’d like to remember?' })}{form.textarea('Preparation checklist', 'checklist', { placeholder: 'What would you like to bring?' })}{form.textarea('Questions to ask', 'questions', { placeholder: 'Add a question for your healthcare professional' })}</div><FormActions editing={!!editing} onCancel={() => { setShowForm(false); setEditing(null); }} /></form></Card>}
    <div className="safety-note"><ShieldCheck size={19} /><p><strong>Your health, your instructions.</strong> Use the plan provided by your healthcare professional. EverAssist does not provide medical advice.</p></div>
  </>;
}

function RemindersPage({ reminders, update, announce, onRequestNotifications }) {
  const empty = { title: '', kind: 'Everyday', time: '08:00', frequency: 'Every day', date: dateKey(today), note: '', acknowledged: false };
  const [editing, setEditing] = useState(null); const [showForm, setShowForm] = useState(false); const [historyOpen, setHistoryOpen] = useState(false);
  const form = useForm(editing || empty, (value) => {
    if (!value.title.trim() || !value.date || !value.time) return;
    update(editing ? reminders.map((r) => r.id === editing.id ? { ...value, id: r.id } : r) : [...reminders, { ...value, id: makeId() }]);
    setShowForm(false); setEditing(null); announce(editing ? 'Reminder updated.' : 'Reminder saved.');
  });
  const acknowledge = (item) => {
    const occurrenceDate = item.occurrenceDate || item.historyDate || dateKey(today);
    const acknowledged = !item.acknowledged;
    update(reminders.map((r) => r.id === item.id ? setReminderAcknowledged(r, occurrenceDate, acknowledged) : r));
    announce(acknowledged ? 'Reminder acknowledged. Well done.' : 'Reminder marked as not yet done.');
  };
  const active = reminders.map((reminder) => ({ ...reminder, occurrenceDate: nextReminderDate(reminder) })).filter((reminder) => reminder.occurrenceDate);
  const done = reminders.flatMap((reminder) => (reminder.acknowledgedDates || [])
    .map((historyDate) => ({ ...reminder, historyDate, acknowledged: true }))
    .concat(!reminder.acknowledgedDates?.length && reminder.acknowledged && reminder.frequency === 'Once'
      ? [{ ...reminder, historyDate: reminder.date, acknowledged: true }]
      : []));
  return <><PageHeading eyebrow="GENTLE NUDGES, ON YOUR TERMS" title="My Reminders" description="A little help remembering, always at your pace." action={<button className="button button-primary" onClick={() => { setEditing(null); form.setForm(empty); setShowForm(!showForm); }}><Plus size={19} /> Add a reminder</button>} />
    <div className="notification-callout"><span className="callout-icon"><Bell size={21} /></span><div><strong>Would you like a gentle nudge?</strong><p>Browser notifications work while this app is open. Your reminders are always listed here.</p></div><button className="button button-secondary" onClick={onRequestNotifications}>Enable notifications</button></div>
    <Card className="section-card"><SectionTitle icon={Bell} title="Coming up" /><div className="reminder-page-list">{active.sort((a, b) => `${a.occurrenceDate}${a.time}`.localeCompare(`${b.occurrenceDate}${b.time}`)).map((item) => <article className="reminder-page-item" key={item.id}><button className="acknowledge-circle" disabled={item.occurrenceDate !== dateKey(today)} onClick={() => acknowledge(item)} aria-label={item.occurrenceDate === dateKey(today) ? `Acknowledge ${item.title}` : `Scheduled ${item.title}`}><Check size={18} /></button><span className={`reminder-symbol ${item.kind === 'Medication' ? 'med-symbol' : ''}`}>{item.kind === 'Medication' ? <Pill size={19} /> : <Clock3 size={19} />}</span><div className="reminder-copy"><span className="reminder-type">{item.kind} · {item.frequency}</span><h3>{item.title}</h3><span>{fmtDate(item.occurrenceDate)} · {formatTime(item.time)}</span>{item.note && <p>{item.note}</p>}</div><EditControls onEdit={() => { setEditing(item); form.setForm(item); setShowForm(true); }} onDelete={() => { update(reminders.filter((r) => r.id !== item.id)); announce('Reminder deleted.'); }} /></article>)}{!active.length && <EmptyState text="You’re all caught up. Add a reminder whenever it would be helpful." />}</div>
      <button className="history-toggle" onClick={() => setHistoryOpen(!historyOpen)}><ChevronRight size={17} className={historyOpen ? 'rotate-icon' : ''} /> Reminder history ({done.length})</button>{historyOpen && <div className="reminder-history">{done.map((item) => <div className="history-row" key={`${item.id}-${item.historyDate}`}><span><Check size={16} /></span><div><strong>{item.title}</strong><small>{fmtDate(item.historyDate)} · {formatTime(item.time)}</small></div><button className="text-button" onClick={() => acknowledge(item)}>Undo</button></div>)}{!done.length && <p className="muted-copy">Acknowledged reminders will appear here.</p>}</div>}
    </Card>
    {showForm && <Card className="form-card"><SectionTitle icon={editing ? Pencil : Plus} title={editing ? 'Edit reminder' : 'Add a reminder'} /><form onSubmit={form.submit}><div className="form-grid">{form.input('What would you like to remember? *', 'title', { required: true, autoFocus: true })}<label className="field">Reminder type<select value={form.form.kind} onChange={form.set('kind')}><option>Everyday</option><option>Medication</option><option>Family</option><option>Appointment</option></select></label>{form.input('Date *', 'date', { type: 'date', required: true })}{form.input('Time *', 'time', { type: 'time', required: true })}<label className="field">Frequency<select value={form.form.frequency} onChange={form.set('frequency')}><option>Once</option><option>Every day</option><option>Weekdays</option><option>Weekly</option></select></label>{form.textarea(form.form.kind === 'Medication' ? 'Note (optional)' : 'A little note', 'note', { placeholder: form.form.kind === 'Medication' ? 'Use the schedule from your healthcare professional' : 'Add a helpful detail' })}</div>{form.form.kind === 'Medication' && <div className="safety-note form-safety"><ShieldCheck size={18} /><p>Enter medication schedules exactly as instructed by your healthcare professional. EverAssist does not recommend medicines or change doses.</p></div>}<FormActions editing={!!editing} onCancel={() => { setShowForm(false); setEditing(null); }} /></form></Card>}
  </>;
}

function InterestsPage({ interests, update, announce }) {
  const [value, setValue] = useState('');
  const suggestions = ['Gardening', 'Painting', 'Reading', 'Cooking', 'Walking', 'Music', 'Puzzles', 'Community activities', 'Bird watching', 'Knitting'];
  const add = (interest) => {
    const clean = interest.trim();
    if (!clean || interests.some((item) => item.toLowerCase() === clean.toLowerCase())) { if (clean) announce('That interest is already on your list.'); return; }
    update([...interests, clean]); setValue(''); announce(`${clean} added to your interests.`);
  };
  return <><PageHeading eyebrow="MAKE ROOM FOR WHAT YOU LOVE" title="My Interests" description="Your interests make a day your own. Keep the things you enjoy close." />
    <Card className="section-card"><SectionTitle icon={Leaf} title="Things you enjoy" /><div className="interest-chips">{interests.map((interest) => <div className="interest-chip" key={interest}><span>🌿</span>{interest}<button aria-label={`Remove ${interest}`} onClick={() => { update(interests.filter((item) => item !== interest)); announce(`${interest} removed from your interests.`); }}><X size={15} /></button></div>)}{!interests.length && <EmptyState text="Add an interest that makes you smile." />}</div><form className="add-interest-form" onSubmit={(event) => { event.preventDefault(); add(value); }}><label className="field">Add something you enjoy<input value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. Listening to music" /></label><button className="button button-primary" type="submit"><Plus size={18} /> Add interest</button></form></Card>
    <Card className="suggestion-card"><SectionTitle icon={Lightbulb} title="A few ideas to get you started" /><p>Choose only what sounds nice. There’s no pressure to try everything.</p><div className="suggestion-chips">{suggestions.filter((item) => !interests.includes(item)).map((interest) => <button key={interest} onClick={() => add(interest)}><Plus size={15} /> {interest}</button>)}</div></Card>
    <Card className="activity-idea"><div className="idea-illustration">🌼</div><div><span className="idea-label">TODAY’S PERSONALIZED IDEA</span><h2>{interests.includes('Gardening') ? 'A moment in the garden' : `A little time for ${interests[0] || 'something you love'}`}</h2><p>{interests.includes('Gardening') ? 'Check on one plant, water a pot, or sit outside and enjoy the fresh air. Even a few minutes count.' : 'Make some space today for an activity you enjoy. A short, easy moment can be just right.'}</p><p className="idea-encouragement">A suggestion, not a to-do. You can save it for another day.</p></div></Card>
  </>;
}

function MemoriesPage({ memories, update, announce }) {
  const empty = { title: '', date: dateKey(today), text: '', photo: '' };
  const [editing, setEditing] = useState(null); const [showForm, setShowForm] = useState(false);
  const form = useForm(editing || empty, (value) => {
    if (!value.title.trim()) return;
    update(editing ? memories.map((m) => m.id === editing.id ? { ...value, id: m.id } : m) : [{ ...value, id: makeId() }, ...memories]);
    setShowForm(false); setEditing(null); announce(editing ? 'Memory updated.' : 'A new memory saved. Thank you for sharing it.');
  });
  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { announce('Please choose an image smaller than 3 MB.'); return; }
    const reader = new FileReader(); reader.onload = () => form.setForm((current) => ({ ...current, photo: reader.result })); reader.readAsDataURL(file);
  };
  return <><PageHeading eyebrow="A PLACE FOR THE MOMENTS THAT MATTER" title="My Memories" description="Write a little, save a photo, or simply take a moment to remember." action={<button className="button button-primary" onClick={() => { setEditing(null); form.setForm(empty); setShowForm(!showForm); }}><Plus size={19} /> Add a memory</button>} />
    <Card className="journal-prompt"><span className="prompt-sparkle">✦</span><div><span className="idea-label">A GENTLE PROMPT</span><h2>What brought you a little joy recently?</h2><p>A memory, a kind word, or something small you noticed. It’s yours to keep.</p></div></Card>
    {showForm && <Card className="form-card"><SectionTitle icon={editing ? Pencil : Plus} title={editing ? 'Edit memory' : 'Save a moment'} /><form onSubmit={form.submit}><div className="form-grid">{form.input('A title for this memory *', 'title', { required: true, autoFocus: true })}{form.input('Date', 'date', { type: 'date' })}{form.textarea('Your memory', 'text', { placeholder: 'Write as much or as little as you like...' })}</div><label className="field upload-field">Add a photograph (optional)<span className="upload-box"><ImagePlus size={19} /> Choose a photograph<input type="file" accept="image/*" onChange={upload} /></span>{form.form.photo && <img className="upload-preview" src={form.form.photo} alt="Selected photo preview" />}</label><FormActions editing={!!editing} onCancel={() => { setShowForm(false); setEditing(null); }} /></form></Card>}
    <div className="memory-grid">{memories.map((memory) => <article className="memory-card" key={memory.id}>{memory.photo ? <img className="memory-photo" src={memory.photo} alt="" /> : <div className="memory-art">{memory.title.toLowerCase().includes('play') ? '🎭' : '🌷'}</div>}<div className="memory-body"><div className="memory-topline"><span>{fmtDate(memory.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span><EditControls onEdit={() => { setEditing(memory); form.setForm(memory); setShowForm(true); }} onDelete={() => { update(memories.filter((m) => m.id !== memory.id)); announce('Memory removed.'); }} /></div><h3>{memory.title}</h3><p>{memory.text}</p></div></article>)}{!memories.length && <Card><EmptyState text="The moments you save will be waiting here whenever you want to revisit them." /></Card>}</div>
  </>;
}

function CompanionPage({ data, update, announce }) {
  const [input, setInput] = useState('');
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const samplePrompts = ['What do I have planned today?', 'When is Emma’s birthday?', 'What should I prepare for tomorrow?'];
  const answerQuestion = (question) => {
    const q = question.toLowerCase(); let answer = ''; let suggestion = null;
    const tomorrowEvents = data.events.filter((event) => event.date === addDays(1));
    if (q.includes('birthday') || q.includes('granddaughter') || q.includes('grandson') || q.includes('emma')) {
      const person = data.family.find((item) => q.includes(item.name.toLowerCase())) || data.family.find((item) => item.relationship.toLowerCase().includes('grand'));
      if (!person) answer = 'I don’t have a family birthday saved yet. You can add one in My Family, and I’ll help you keep it in mind.';
      else { const days = daysUntilBirthday(person.birthday); answer = person.birthday ? `${person.name}’s birthday is ${days === 0 ? 'today' : `in ${days} days, on ${fmtDate(nextBirthdayDate(person.birthday))}`}. Would you like to add a reminder to prepare a message?` : `I don’t have ${person.name}’s birthday saved yet. You can add it in My Family.`; if (person.birthday) suggestion = { title: `Prepare a birthday message for ${person.name}`, date: addDays(Math.max(0, days - 1)), kind: 'Family' }; }
    } else if (q.includes('doctor') || q.includes('appointment') || q.includes('prepare') || q.includes('tomorrow')) {
      const found = q.includes('tomorrow') || q.includes('prepare') ? tomorrowEvents : data.events.filter((event) => event.date >= dateKey(today));
      answer = found.length ? `You have ${found.map((event) => `${event.title} ${event.date === addDays(1) ? 'tomorrow' : `on ${fmtDate(event.date)}`} at ${formatTime(event.time)}${event.location ? ` at ${event.location}` : ''}`).join(' and ')}.${found.some((e) => e.checklist || e.questions) ? ` Preparation: ${found.map((e) => [e.checklist && `bring ${e.checklist}`, e.questions && `ask ${e.questions}`].filter(Boolean).join('; ')).filter(Boolean).join('. ')}` : ' You can add a preparation checklist in My Schedule.'}` : 'I don’t see any upcoming appointments saved. You can add one in My Schedule whenever you need.';
    } else if (q.includes('today') || q.includes('planned') || q.includes('schedule')) {
      const events = data.events.filter((event) => event.date === dateKey(today));
      const rems = data.reminders.filter((item) => reminderOccursOn(item, dateKey(today)) && !isReminderAcknowledged(item, dateKey(today)));
      answer = `For today${events.length ? `, you have ${events.map((e) => `${e.title} at ${formatTime(e.time)}`).join(' and ')}` : ', your schedule looks clear'}${rems.length ? `. A gentle reminder: ${rems.map((r) => `${r.title} at ${formatTime(r.time)}`).join(' and ')}` : ''}. ${data.interests.length ? `If you’d like a little activity, perhaps ${data.interests[0].toLowerCase()} could be nice.` : 'There’s plenty of room to choose what feels right.'}`;
    } else if (q.includes('hobby') || q.includes('activity') || q.includes('garden') || q.includes('do today')) {
      answer = data.interests.length ? `You enjoy ${data.interests.join(', ').replace(/, ([^,]*)$/, ' and $1')}. Perhaps ${data.interests[0].toLowerCase()} would be a lovely way to spend a little time. No pressure—choose what feels good.` : 'Perhaps a short walk, a favorite song, or a call to someone you love might feel nice. Add your favorite things in My Interests to make my ideas more personal.';
    } else if (q.includes('remind') || q.includes('call') || q.includes('message')) {
      const person = data.family.find((p) => q.includes(p.name.toLowerCase())) || data.family.find((p) => p.relationship.toLowerCase().includes('daughter'));
      if (person) answer = `I can help you remember to connect with ${person.name}. Would you like me to add a reminder?`;
      else answer = 'I can help you remember. Would you like to add a reminder?';
      suggestion = { title: `Call or message${person ? ` ${person.name}` : ' family'}`, date: dateKey(today), kind: 'Family' };
    } else if (q.includes('hello') || q.includes('hi ') || q === 'hi') answer = `Hello, ${data.name}. It’s lovely to spend a moment with you. What’s on your mind?`;
    else answer = 'I’m here to help you keep track of your plans, family dates, reminders, and favorite activities. What would you like to know?';
    update('chats', [...data.chats, { id: makeId(), role: 'user', text: question }, { id: makeId(), role: 'assistant', text: answer }]);
    setPendingSuggestion(suggestion);
    setInput('');
  };
  const addSuggestedReminder = () => {
    if (!pendingSuggestion) return;
    const reminder = { ...pendingSuggestion, id: makeId(), time: '10:00', frequency: 'Once', acknowledged: false, note: 'Added at your request in AI Companion.' };
    update('reminders', [...data.reminders, reminder]);
    update('chats', [...data.chats, { id: makeId(), role: 'assistant', text: 'All set. I added that reminder for you. You can change or remove it any time in My Reminders.' }]);
    setPendingSuggestion(null);
    announce('Reminder added at your request. You can edit or remove it in My Reminders.');
  };
  const declineSuggestion = () => {
    update('chats', [...data.chats, { id: makeId(), role: 'assistant', text: 'Of course. I haven’t added anything. You can ask me whenever you’re ready.' }]);
    setPendingSuggestion(null);
  };
  const nextAppointment = data.events.filter((e) => e.date >= dateKey(today)).sort((a, b) => a.date.localeCompare(b.date))[0];
  return <><PageHeading eyebrow="A HELPFUL VOICE, ALWAYS AT YOUR PACE" title="AI Companion" description="Ask about your plans, important dates, or what you feel like doing." />
    <div className="companion-layout"><Card className="chat-card"><div className="chat-header"><div className="assistant-avatar"><Sparkles size={23} /></div><div><h2>Your EverAssist companion</h2><span><span className="online-dot" /> Here to help, whenever you need</span></div><span className="sample-pill">SAMPLE AI</span></div>
      <div className="chat-body" aria-live="polite"><div className="chat-bubble assistant-bubble"><span className="bubble-avatar"><Sparkles size={15} /></span><p>Good morning, {data.name}. I can help you remember the things that matter. What’s on your mind?</p></div>{data.chats.map((message) => <div className={`chat-bubble ${message.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`} key={message.id}>{message.role === 'assistant' && <span className="bubble-avatar"><Sparkles size={15} /></span>}<p>{message.text}</p></div>)}</div>
      {pendingSuggestion && <div className="suggestion-confirm"><span>Would you like me to add “{pendingSuggestion.title}” for {fmtDate(pendingSuggestion.date)}?</span><button className="button button-primary" onClick={addSuggestedReminder}>Yes, add reminder</button><button className="button button-quiet" onClick={declineSuggestion}>Not now</button></div>}
      <div className="quick-prompts"><span>YOU CAN ASK</span>{samplePrompts.map((prompt) => <button key={prompt} onClick={() => answerQuestion(prompt)}>{prompt}</button>)}</div>
      <form className="chat-input-form" onSubmit={(event) => { event.preventDefault(); if (input.trim()) answerQuestion(input.trim()); }}><label className="sr-only" htmlFor="chat-input">Type a message for your companion</label><input id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type a message or question..." /><button className="button button-primary" type="submit" disabled={!input.trim()}><Send size={18} /><span>Send</span></button></form>
    </Card>
      <aside className="companion-aside"><Card><SectionTitle icon={Sparkles} title="A few helpful details" />{nextAppointment ? <div className="aside-detail"><span className="aside-icon blue"><CalendarDays size={18} /></span><div><strong>Coming up</strong><p>{nextAppointment.title}</p><small>{nextAppointment.date === addDays(1) ? 'Tomorrow' : fmtDate(nextAppointment.date)} · {formatTime(nextAppointment.time)}</small></div></div> : <p className="muted-copy">Your upcoming plans will appear here.</p>}{data.family.filter((p) => daysUntilBirthday(p.birthday) !== null).slice(0, 1).map((person) => <div className="aside-detail" key={person.id}><span className="aside-icon peach">♡</span><div><strong>Someone special</strong><p>{person.name}’s birthday</p><small>In {daysUntilBirthday(person.birthday)} days</small></div></div>)}</Card><div className="permission-note"><ShieldCheck size={18} /><p>I’ll always ask before adding or changing a reminder. I won’t contact anyone on your behalf.</p></div><div className="companion-notice"><Smile size={19} /><p>I’m a simple on-device demo companion, not a healthcare professional. Your saved information stays in this browser.</p></div></aside>
    </div>
  </>;
}
function nextBirthdayDate(date) {
  const parts = date.split('-').map(Number); const now = new Date();
  let d = new Date(now.getFullYear(), parts[1] - 1, parts[2], 12);
  if (dateKey(d) < dateKey(now)) d.setFullYear(now.getFullYear() + 1);
  return dateKey(d);
}

export default App;
