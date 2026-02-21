import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { api } from '../api/client';
import { t } from '../i18n';

const STATUS_ORDER = ['COLLECTING_SUGGESTIONS','VOTING_OPEN','VOTING_CLOSED','LOCKED','BOOKING_IN_PROGRESS','BOOKED'];

export default function TripRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const flags = useFeatureFlags();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [tab, setTab] = useState('plan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTrip = useCallback(async () => {
    try {
      const data = await api.get(`/trips/${id}`);
      setTrip(data);
    } catch (err) {
      setError(err.error || 'Kunne ikke laste tur');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  if (loading) return <div className="spinner" />;
  if (error) return <div className="page"><div className="card" style={{color:'var(--danger)'}}>{error}</div></div>;
  if (!trip) return null;

  const isLeader = trip.leader_user_id === user?.id;
  const role = trip.currentUserRole;
  const isBooker = role === 'BOOKER' || isLeader;
  const statusIdx = STATUS_ORDER.indexOf(trip.status);

  const tabs = [
    { key: 'plan', label: t('plan') },
    { key: 'vote', label: t('vote') },
    { key: 'chat', label: t('chat') },
    { key: 'itinerary', label: t('itinerary') },
    { key: 'documents', label: t('documents') },
    { key: 'inbox', label: t('inbox') },
    ...(isLeader ? [{ key: 'settings', label: t('settings') }] : []),
  ];

  return (
    <div className="page-wide fade-in">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700}}>{trip.title}</h1>
          <div style={{fontSize:13,color:'var(--text-light)'}}>
            {trip.start_date} - {trip.end_date} | {trip.members?.length || 0} {t('members').toLowerCase()}
            {trip.invite_code && ` | Kode: ${trip.invite_code}`}
          </div>
        </div>
        <span className={`badge ${statusIdx >= 3 ? 'badge-success' : statusIdx >= 1 ? 'badge-warning' : 'badge-primary'}`}>
          {t(trip.status.toLowerCase())}
        </span>
      </div>

      {/* Status bar */}
      <div className="status-bar">
        {STATUS_ORDER.map((s, i) => (
          <div key={s} className={`status-step ${i <= statusIdx ? 'done' : ''} ${i === statusIdx ? 'active' : ''}`} title={t(s.toLowerCase())} />
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tb => (
          <div key={tb.key} className={`tab ${tab === tb.key ? 'active' : ''}`} onClick={() => setTab(tb.key)}>
            {tb.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'plan' && <PlanTab trip={trip} isLeader={isLeader} onRefresh={loadTrip} />}
      {tab === 'vote' && <VoteTab trip={trip} isLeader={isLeader} onRefresh={loadTrip} />}
      {tab === 'chat' && <ChatTab tripId={id} user={user} />}
      {tab === 'itinerary' && <ItineraryTab trip={trip} flags={flags} />}
      {tab === 'documents' && <DocumentsTab tripId={id} flags={flags} />}
      {tab === 'inbox' && <InboxTab />}
      {tab === 'settings' && <SettingsTab trip={trip} onRefresh={loadTrip} />}
    </div>
  );
}

/* ========== PLAN TAB ========== */
function PlanTab({ trip, isLeader, onRefresh }) {
  const [plan, setPlan] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchType, setSearchType] = useState('COUNTRY');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    api.get(`/trips/${trip.id}/plan`).then(setPlan).catch(() => {});
    api.get(`/trips/${trip.id}/suggestions`).then(setSuggestions).catch(() => {});
  }, [trip.id]);

  const searchCatalog = async () => {
    if (!searchQ) return;
    const results = await api.get(`/catalog/search?q=${searchQ}&type=${searchType}`);
    setCatalog(results);
  };

  const addGroup = async (type, parentId) => {
    await api.post(`/trips/${trip.id}/plan/groups`, { type, parent_group_id: parentId });
    const updated = await api.get(`/trips/${trip.id}/plan`);
    setPlan(updated);
  };

  const addItem = async (groupId, objectId) => {
    await api.post(`/trips/${trip.id}/plan/items`, { group_id: groupId, catalog_object_id: objectId });
    const updated = await api.get(`/trips/${trip.id}/plan`);
    setPlan(updated);
  };

  const removeItem = async (itemId) => {
    await api.delete(`/trips/${trip.id}/plan/items/${itemId}`);
    const updated = await api.get(`/trips/${trip.id}/plan`);
    setPlan(updated);
  };

  const suggestItem = async (objectId) => {
    await api.post(`/trips/${trip.id}/suggestions`, { target_group_type: searchType, catalog_object_id: objectId });
    const updated = await api.get(`/trips/${trip.id}/suggestions`);
    setSuggestions(updated);
  };

  const reviewSuggestion = async (suggId, status, groupId) => {
    await api.put(`/trips/${trip.id}/suggestions/${suggId}`, { status, group_id: groupId });
    const updated = await api.get(`/trips/${trip.id}/suggestions`);
    setSuggestions(updated);
    const planUpdated = await api.get(`/trips/${trip.id}/plan`);
    setPlan(planUpdated);
  };

  const enabledTypes = [];
  if (trip.enable_country) enabledTypes.push('COUNTRY');
  if (trip.enable_place) enabledTypes.push('PLACE');
  if (trip.enable_hotel) enabledTypes.push('HOTEL');
  if (trip.enable_activity) enabledTypes.push('ACTIVITY');

  const pendingSuggestions = suggestions.filter(s => s.status === 'PENDING');

  return (
    <div>
      {/* Current plan tree */}
      <div className="card">
        <h3 style={{fontWeight:700,marginBottom:12}}>Plantre</h3>
        {plan.length === 0 && <p style={{color:'var(--text-light)'}}>Ingen alternativer lagt til ennå.</p>}
        {plan.map(group => (
          <div key={group.id} style={{marginBottom:12,paddingLeft: group.parent_group_id ? 20 : 0}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--primary)',marginBottom:4}}>
              {group.type} {group.status === 'LOCKED' && <span className="badge badge-success" style={{marginLeft:8}}>Låst</span>}
            </div>
            {group.items?.map(item => (
              <div key={item.id} className="list-item">
                <div style={{flex:1}}>
                  <div style={{fontWeight:600}}>{item.name}</div>
                  <div style={{fontSize:12,color:'var(--text-light)'}}>{item.city || item.country_code} | {item.source === 'USER_SUGGESTED_APPROVED' ? 'Foreslått' : 'Kuratert'}</div>
                </div>
                {isLeader && <button className="btn btn-small btn-danger" onClick={() => removeItem(item.id)}>Fjern</button>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Add groups (leader) */}
      {isLeader && (
        <div className="card">
          <h3 style={{fontWeight:700,marginBottom:12}}>Legg til grupper</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {enabledTypes.map(type => (
              <button key={type} className="btn btn-small btn-secondary" onClick={() => addGroup(type, null)}>
                + {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & add items */}
      <div className="card">
        <h3 style={{fontWeight:700,marginBottom:12}}>Søk og legg til</h3>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <select value={searchType} onChange={e => setSearchType(e.target.value)} style={{padding:8,borderRadius:8,border:'2px solid var(--border)'}}>
            {enabledTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={t('search')} style={{flex:1,padding:8,borderRadius:8,border:'2px solid var(--border)'}} onKeyDown={e => e.key === 'Enter' && searchCatalog()} />
          <button className="btn btn-small btn-primary" onClick={searchCatalog}>{t('search')}</button>
        </div>
        {catalog.map(obj => (
          <div key={obj.id} className="list-item">
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>{obj.name}</div>
              <div style={{fontSize:12,color:'var(--text-light)'}}>{obj.city || obj.country_code} | {obj.type}</div>
            </div>
            {isLeader && plan.length > 0 && (
              <select onChange={e => { if (e.target.value) addItem(e.target.value, obj.id); e.target.value = ''; }} style={{padding:6,borderRadius:6,border:'1px solid var(--border)',fontSize:13}}>
                <option value="">Legg i...</option>
                {plan.filter(g => g.type === obj.type).map(g => <option key={g.id} value={g.id}>{g.type} #{plan.indexOf(g)+1}</option>)}
              </select>
            )}
            {!isLeader && <button className="btn btn-small btn-secondary" onClick={() => suggestItem(obj.id)}>Foreslå</button>}
          </div>
        ))}
      </div>

      {/* Pending suggestions (leader) */}
      {isLeader && pendingSuggestions.length > 0 && (
        <div className="card">
          <h3 style={{fontWeight:700,marginBottom:12}}>Ventende forslag ({pendingSuggestions.length})</h3>
          {pendingSuggestions.map(s => (
            <div key={s.id} className="list-item">
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{s.name}</div>
                <div style={{fontSize:12,color:'var(--text-light)'}}>Foreslått av {s.suggested_by_username} | {s.target_group_type}</div>
              </div>
              <div style={{display:'flex',gap:4}}>
                <select onChange={e => { if (e.target.value) reviewSuggestion(s.id, 'APPROVED', e.target.value); }} style={{padding:4,borderRadius:6,border:'1px solid var(--border)',fontSize:12}}>
                  <option value="">Godkjenn i...</option>
                  {plan.filter(g => g.type === s.target_group_type).map(g => <option key={g.id} value={g.id}>{g.type} #{plan.indexOf(g)+1}</option>)}
                </select>
                <button className="btn btn-small btn-danger" onClick={() => reviewSuggestion(s.id, 'REJECTED')}>{t('reject')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== VOTE TAB ========== */
function VoteTab({ trip, isLeader, onRefresh }) {
  const [plan, setPlan] = useState([]);
  const [results, setResults] = useState(null);
  const [myVotes, setMyVotes] = useState([]);
  const [selectedRanking, setSelectedRanking] = useState({});
  const [activeGroup, setActiveGroup] = useState(null);

  useEffect(() => {
    api.get(`/trips/${trip.id}/plan`).then(setPlan).catch(() => {});
    api.get(`/trips/${trip.id}/votes/results`).then(setResults).catch(() => {});
    api.get(`/trips/${trip.id}/votes/my`).then(setMyVotes).catch(() => {});
  }, [trip.id]);

  const votableGroups = plan.filter(g => g.items && g.items.length >= 2);

  const submitVote = async (groupId, context) => {
    const ranking = selectedRanking[groupId];
    if (!ranking || ranking.length === 0) return;
    await api.post(`/trips/${trip.id}/votes`, { vote_context: context, target_group_id: groupId, ranking });
    const updated = await api.get(`/trips/${trip.id}/votes/results`);
    setResults(updated);
    const myUpdated = await api.get(`/trips/${trip.id}/votes/my`);
    setMyVotes(myUpdated);
  };

  const toggleRank = (groupId, objId) => {
    setSelectedRanking(prev => {
      const current = prev[groupId] || [];
      if (current.includes(objId)) {
        return { ...prev, [groupId]: current.filter(id => id !== objId) };
      }
      if (current.length >= 3) return prev;
      return { ...prev, [groupId]: [...current, objId] };
    });
  };

  const lockVoting = async () => {
    await api.put(`/trips/${trip.id}`, { status: 'LOCKED' });
    onRefresh();
  };

  const openVoting = async () => {
    await api.put(`/trips/${trip.id}`, { status: 'VOTING_OPEN' });
    onRefresh();
  };

  const nudge = async () => {
    await api.post(`/trips/${trip.id}/nudge`);
    alert('Påminnelse sendt!');
  };

  const isVotingAllowed = trip.status === 'VOTING_OPEN' || trip.status === 'COLLECTING_SUGGESTIONS';
  const isLocked = trip.status === 'LOCKED' || trip.status === 'VOTING_CLOSED';

  return (
    <div>
      {/* Leader controls */}
      {isLeader && (
        <div className="card" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {!isLocked && <button className="btn btn-small btn-primary" onClick={openVoting}>Åpne avstemning</button>}
          {isVotingAllowed && <button className="btn btn-small btn-danger" onClick={lockVoting}>{t('lock_voting')}</button>}
          <button className="btn btn-small btn-warning" onClick={nudge}>{t('remind_to_vote')}</button>
        </div>
      )}

      {/* Voting groups */}
      {votableGroups.map(group => {
        const ranking = selectedRanking[group.id] || [];
        const myVote = myVotes.find(v => v.target_group_id === group.id);
        const groupAgg = results?.aggregates?.filter(a => a.group_id === group.id) || [];
        const groupVoters = results?.voters?.filter(v => v.target_group_id === group.id) || [];
        const maxPts = Math.max(...groupAgg.map(a => a.points_total), 1);

        return (
          <div key={group.id} className="card">
            <h3 style={{fontWeight:700,marginBottom:4}}>{group.type}</h3>
            <div style={{fontSize:13,color:'var(--text-light)',marginBottom:12}}>
              Har stemt: {groupVoters.length}/{results?.totalMembers || '?'} ({groupVoters.map(v => v.username).join(', ') || 'Ingen ennå'})
            </div>

            {/* Vote options */}
            {isVotingAllowed && !myVote && (
              <>
                <p style={{fontSize:13,marginBottom:8}}>Klikk for å rangere 1-3 (i rekkefølge):</p>
                {group.items.map(item => {
                  const rankIdx = ranking.indexOf(item.catalog_object_id);
                  return (
                    <div key={item.id} className={`vote-option ${rankIdx >= 0 ? 'selected' : ''}`}
                      onClick={() => toggleRank(group.id, item.catalog_object_id)}>
                      {rankIdx >= 0 && <div className="rank">{rankIdx + 1}</div>}
                      <div style={{fontWeight:600}}>{item.name}</div>
                      <div style={{fontSize:12,color:'var(--text-light)'}}>{item.city || ''}</div>
                    </div>
                  );
                })}
                <button className="btn btn-primary" style={{marginTop:8}} onClick={() => submitVote(group.id, group.type)} disabled={ranking.length === 0}>
                  {t('submit_vote')} ({ranking.length}/3)
                </button>
              </>
            )}

            {myVote && <div className="badge badge-success" style={{marginBottom:12}}>Du har stemt!</div>}

            {/* Results */}
            {groupAgg.length > 0 && (
              <div style={{marginTop:8}}>
                <h4 style={{fontSize:14,fontWeight:700,marginBottom:8}}>Resultater {isLocked && '(endelig)'}</h4>
                {groupAgg.map((agg, i) => (
                  <div key={agg.catalog_object_id} style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:14}}>
                      <span>{i === 0 && isLocked ? '\u{1F3C6} ' : ''}<strong>{agg.name}</strong></span>
                      <span>{agg.points_total} poeng (#{agg.first_place_count}/{agg.second_place_count}/{agg.third_place_count})</span>
                    </div>
                    <div className="result-bar">
                      <div className="result-bar-fill" style={{width:`${(agg.points_total/maxPts)*100}%`, background: i === 0 ? 'var(--success)' : 'var(--primary)'}}>{agg.points_total}p</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {votableGroups.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">&#128499;&#65039;</div>
          <p>Legg til minst 2 alternativer i Plan-fanen for å starte avstemning.</p>
        </div>
      )}
    </div>
  );
}

/* ========== CHAT TAB ========== */
function ChatTab({ tripId, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    try {
      const msgs = await api.get(`/trips/${tripId}/chat`);
      setMessages(msgs);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    await api.post(`/trips/${tripId}/chat`, { text });
    setText('');
    loadMessages();
  };

  const addReaction = async (msgId, emoji) => {
    await api.post(`/trips/${tripId}/chat/${msgId}/reactions`, { emoji });
    loadMessages();
  };

  const EMOJIS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F389}', '\u{1F914}', '\u{1F525}'];

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {loading && <div className="spinner" />}
        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg ${msg.sender_user_id === user?.id ? 'chat-msg-own' : ''}`}>
            {msg.sender_user_id !== user?.id && <div className="chat-msg-sender">{msg.first_name || msg.username}</div>}
            <div className="chat-msg-bubble">
              {msg.text}
              <div className="chat-msg-time">{new Date(msg.created_at).toLocaleTimeString('no-NO', {hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div className="reactions">
              {EMOJIS.map(e => {
                const count = msg.reactions?.filter(r => r.emoji === e).length || 0;
                const isOwn = msg.reactions?.some(r => r.emoji === e && r.user_id === user?.id);
                return count > 0 || false ? (
                  <span key={e} className={`reaction ${isOwn ? 'own' : ''}`} onClick={() => addReaction(msg.id, e)}>{e} {count}</span>
                ) : null;
              })}
              <span className="reaction" style={{fontSize:11}} onClick={(ev) => {
                const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
                addReaction(msg.id, emoji);
              }}>+</span>
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Skriv en melding..." onKeyDown={e => e.key === 'Enter' && sendMessage()} />
        <button className="btn btn-small btn-primary" onClick={sendMessage}>{t('send')}</button>
      </div>
    </div>
  );
}

/* ========== ITINERARY TAB ========== */
function ItineraryTab({ trip, flags }) {
  const [plan, setPlan] = useState([]);
  const [results, setResults] = useState(null);
  const [transport, setTransport] = useState(null);
  const [transportError, setTransportError] = useState(false);
  const [flightSearch, setFlightSearch] = useState(null);
  const [flightError, setFlightError] = useState(false);

  useEffect(() => {
    api.get(`/trips/${trip.id}/plan`).then(setPlan).catch(() => {});
    api.get(`/trips/${trip.id}/votes/results`).then(setResults).catch(() => {});
  }, [trip.id]);

  useEffect(() => {
    if (flags.transport_enabled) {
      api.get(`/trips/${trip.id}/transport?airport=BCN&city=Barcelona`)
        .then(setTransport)
        .catch(() => setTransportError(true));
    }
    if (flags.flights_enabled) {
      api.get(`/trips/${trip.id}/flights?from=OSL&date=${trip.start_date}`)
        .then(setFlightSearch)
        .catch(() => setFlightError(true));
    }
  }, [trip.id, flags]);

  const isLocked = ['LOCKED','BOOKING_IN_PROGRESS','BOOKED'].includes(trip.status);

  // Get winners per group
  const getWinner = (groupId) => {
    if (!results?.aggregates) return null;
    const groupAgg = results.aggregates.filter(a => a.group_id === groupId);
    return groupAgg.sort((a,b) => b.points_total - a.points_total || b.first_place_count - a.first_place_count)[0];
  };

  // Generate day-by-day
  const generateDays = () => {
    if (!trip.start_date || !trip.end_date) return [];
    const days = [];
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d).toISOString().split('T')[0]);
    }
    return days;
  };

  if (!isLocked) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#128197;</div>
        <p>Reiseplanen vises når avstemningen er låst.</p>
      </div>
    );
  }

  const days = generateDays();

  return (
    <div>
      {/* Summary */}
      <div className="card">
        <h3 style={{fontWeight:700,marginBottom:12}}>{t('finished_trip')}</h3>
        {plan.map(group => {
          const winner = getWinner(group.id);
          return winner ? (
            <div key={group.id} style={{padding:8,borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:12,fontWeight:700,color:'var(--primary)'}}>{group.type}</span>
              <div style={{fontWeight:600}}>{winner.name}</div>
            </div>
          ) : null;
        })}
      </div>

      {/* Day by day */}
      <div className="card">
        <h3 style={{fontWeight:700,marginBottom:12}}>Dag for dag</h3>
        {days.map((day, i) => (
          <div key={day} className="itinerary-day">
            <div className="itinerary-date">Dag {i+1} - {new Date(day).toLocaleDateString('no-NO', {weekday:'long',day:'numeric',month:'long'})}</div>
            {i === 0 && flightSearch && flightSearch[0] && (
              <div className="itinerary-item">&#9992;&#65039; Fly: {flightSearch[0].airline} {flightSearch[0].departure} ({flightSearch[0].pricePerPerson} NOK/pers)</div>
            )}
            {i === 0 && <div className="itinerary-item">&#127968; Innsjekking hotell</div>}
            <div className="itinerary-item">&#127965;&#65039; Fri dag / aktiviteter</div>
            {i === days.length - 1 && <div className="itinerary-item">&#128188; Utsjekking og hjemreise</div>}
          </div>
        ))}
      </div>

      {/* Booking wizard */}
      <BookingWizard trip={trip} flags={flags} flightSearch={flightSearch} />

      {/* Transport */}
      {flags.transport_enabled && !transportError && transport && (
        <div className="card">
          <h3 style={{fontWeight:700,marginBottom:12}}>{t('transport_to_hotel')}</h3>
          {transport.map((opt, i) => (
            <div key={i} className="list-item">
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{opt.name}</div>
                <div style={{fontSize:13,color:'var(--text-light)'}}>{opt.estimatedTime} | {opt.estimatedPrice}</div>
              </div>
              <a href={opt.bookingUrl} className="btn btn-small btn-secondary" target="_blank" rel="noopener">{t('book_now')}</a>
            </div>
          ))}
        </div>
      )}
      {transportError && (
        <div className="degraded-module">
          Transportforslag utilgjengelig akkurat nå
        </div>
      )}
      {flightError && flags.flights_enabled && (
        <div className="degraded-module">
          Fly-leverandør midlertidig utilgjengelig. Prøv igjen senere.
        </div>
      )}
    </div>
  );
}

/* ========== BOOKING WIZARD ========== */
function BookingWizard({ trip, flags, flightSearch }) {
  const [step, setStep] = useState(0);
  const [passengers, setPassengers] = useState(null);
  const [bookingStarted, setBookingStarted] = useState(false);

  const startBooking = async () => {
    try {
      const p = await api.get(`/trips/${trip.id}/passengers`);
      setPassengers(p);
      setBookingStarted(true);
      setStep(1);
      await api.put(`/trips/${trip.id}`, { status: 'BOOKING_IN_PROGRESS' });
    } catch (err) {
      alert(err.error || 'Kunne ikke starte booking');
    }
  };

  const markBooked = async () => {
    await api.put(`/trips/${trip.id}`, { status: 'BOOKED' });
    alert('Tur markert som booket!');
  };

  const isLocked = ['LOCKED','BOOKING_IN_PROGRESS','BOOKED'].includes(trip.status);
  if (!isLocked) return null;

  return (
    <div className="card">
      <h3 style={{fontWeight:700,marginBottom:12}}>Booking</h3>

      {!bookingStarted && trip.status !== 'BOOKED' && (
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={startBooking}>{t('book_all')}</button>
        </div>
      )}

      {trip.status === 'BOOKED' && (
        <div className="badge badge-success" style={{fontSize:16,padding:'8px 16px'}}>Reisen er booket!</div>
      )}

      {bookingStarted && (
        <div>
          <div className="status-bar" style={{marginBottom:16}}>
            <div className={`status-step ${step >= 1 ? 'active' : ''}`} />
            <div className={`status-step ${step >= 2 ? 'active' : ''}`} />
            <div className={`status-step ${step >= 3 ? 'active' : ''}`} />
          </div>

          {step === 1 && (
            <div>
              <h4 style={{fontWeight:600,marginBottom:8}}>Steg 1: {t('flights')}</h4>
              {!flags.flights_enabled ? (
                <div className="degraded-module">{t('unavailable')}</div>
              ) : (
                <>
                  {flightSearch && flightSearch.slice(0, 3).map((f, i) => (
                    <div key={i} className="list-item" style={{background: i === 0 ? '#f0fdf4' : ''}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600}}>{f.airline} | {f.from} → {f.to}</div>
                        <div style={{fontSize:13}}>{f.departure} - {f.arrival} | {f.duration} | {f.stops === 0 ? 'Direkte' : `${f.stops} stopp`}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontWeight:700}}>{f.pricePerPerson} NOK</div>
                        <div style={{fontSize:12}}>per pers</div>
                      </div>
                    </div>
                  ))}
                  {passengers && (
                    <div style={{marginTop:8,padding:12,background:'#f0f4ff',borderRadius:8,fontSize:13}}>
                      <strong>Passasjerer ({passengers.length}):</strong>
                      {passengers.map((p, i) => <div key={i}>{p.first_name} {p.last_name} ({p.nationality})</div>)}
                    </div>
                  )}
                  <button className="btn btn-primary" style={{marginTop:8}} onClick={() => { alert('Demo: Redirect til fly-leverandør (simulert)'); setStep(2); }}>Book fly (demo-redirect)</button>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h4 style={{fontWeight:600,marginBottom:8}}>Steg 2: {t('hotels')}</h4>
              {!flags.hotels_enabled ? (
                <div className="degraded-module">{t('unavailable')}</div>
              ) : (
                <button className="btn btn-primary" onClick={() => { alert('Demo: Redirect til hotell-leverandør (simulert)'); setStep(3); }}>Book hotell (demo-redirect)</button>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h4 style={{fontWeight:600,marginBottom:8}}>Steg 3: {t('activities')}</h4>
              {!flags.activities_enabled ? (
                <div className="degraded-module">{t('unavailable')}</div>
              ) : (
                <button className="btn btn-primary" onClick={() => { alert('Demo: Redirect til aktivitets-leverandør (simulert)'); markBooked(); }}>Book aktiviteter (demo-redirect)</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========== DOCUMENTS TAB ========== */
function DocumentsTab({ tripId, flags }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flags.documents_enabled) { setLoading(false); return; }
    api.get(`/trips/${tripId}/documents`).then(setDocs).catch(() => {}).finally(() => setLoading(false));
  }, [tripId, flags]);

  const simulateDoc = async (type, title) => {
    await api.post(`/trips/${tripId}/documents/simulate`, { type, title });
    const updated = await api.get(`/trips/${tripId}/documents`);
    setDocs(updated);
  };

  if (!flags.documents_enabled) {
    return <div className="degraded-module">Dokumenter kan være forsinket - modulen er utilgjengelig</div>;
  }

  return (
    <div>
      <div className="card">
        <h3 style={{fontWeight:700,marginBottom:12}}>{t('documents')}</h3>
        {loading && <div className="spinner" />}
        {!loading && docs.length === 0 && (
          <p style={{color:'var(--text-light)'}}>Ingen dokumenter mottatt ennå.</p>
        )}
        {Array.isArray(docs) && docs.map(doc => (
          <div key={doc.id} className="list-item">
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>{doc.title || doc.type}</div>
              <div style={{fontSize:12,color:'var(--text-light)'}}>{doc.provider} | {new Date(doc.created_at).toLocaleDateString('no-NO')}</div>
            </div>
            <a href={doc.url || '#'} className="btn btn-small btn-secondary" target="_blank" rel="noopener">Åpne</a>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{fontWeight:700,marginBottom:12}}>Simuler dokumenter (demo)</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-small btn-secondary" onClick={() => simulateDoc('FLIGHT_TICKET', 'Flybillett Oslo-Barcelona')}>+ Flybillett</button>
          <button className="btn btn-small btn-secondary" onClick={() => simulateDoc('HOTEL_CONFIRMATION', 'Hotellbekreftelse')}>+ Hotellbekreftelse</button>
          <button className="btn btn-small btn-secondary" onClick={() => simulateDoc('ACTIVITY_TICKET', 'Aktivitetsbillett')}>+ Aktivitetsbillett</button>
        </div>
      </div>
    </div>
  );
}

/* ========== INBOX TAB ========== */
function InboxTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(setNotifications).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const typeLabels = {
    REMINDER: 'Påminnelse',
    VOTING_STARTED: 'Avstemning startet',
    VOTING_LOCKED_RESULT: 'Resultat klart',
    INVITATION: 'Invitasjon',
    BOOKER_ASSIGNED: 'Booker valgt',
    GENERAL: 'Varsel',
  };

  return (
    <div className="card">
      <h3 style={{fontWeight:700,marginBottom:12}}>{t('inbox')}</h3>
      {loading && <div className="spinner" />}
      {!loading && notifications.length === 0 && <p style={{color:'var(--text-light)'}}>Ingen varsler.</p>}
      {notifications.map(n => {
        const payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload;
        return (
          <div key={n.id} className="list-item" style={{background: n.read_at ? '' : '#eff6ff', cursor:'pointer'}} onClick={() => markRead(n.id)}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>
                {!n.read_at && <span style={{width:8,height:8,background:'var(--primary)',borderRadius:4,display:'inline-block',marginRight:6}} />}
                {typeLabels[n.type] || n.type}
              </div>
              <div style={{fontSize:13,color:'var(--text-light)'}}>{payload?.message || ''} {n.trip_title && `| ${n.trip_title}`}</div>
              <div style={{fontSize:11,color:'var(--text-light)'}}>{new Date(n.created_at).toLocaleString('no-NO')}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========== SETTINGS TAB ========== */
function SettingsTab({ trip, onRefresh }) {
  const [bookerUserId, setBookerUserId] = useState('');

  const updateStatus = async (status) => {
    await api.put(`/trips/${trip.id}`, { status });
    onRefresh();
  };

  const assignBooker = async () => {
    if (!bookerUserId) return;
    await api.put(`/trips/${trip.id}`, { booker_user_id: bookerUserId });
    onRefresh();
  };

  const removeMember = async (userId) => {
    if (!confirm('Fjerne dette medlemmet?')) return;
    await api.delete(`/trips/${trip.id}/members/${userId}`);
    onRefresh();
  };

  return (
    <div>
      <div className="card">
        <h3 style={{fontWeight:700,marginBottom:12}}>{t('settings')}</h3>

        <div className="form-group">
          <label>Status</label>
          <select value={trip.status} onChange={e => updateStatus(e.target.value)}>
            {['COLLECTING_SUGGESTIONS','VOTING_OPEN','VOTING_CLOSED','LOCKED','BOOKING_IN_PROGRESS','BOOKED'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Invitasjonskode</label>
          <div style={{padding:12,background:'#f0f4ff',borderRadius:8,fontWeight:700,fontSize:18,textAlign:'center'}}>
            {trip.invite_code}
          </div>
        </div>

        <div className="form-group">
          <label>Utpek booker</label>
          <select value={bookerUserId} onChange={e => setBookerUserId(e.target.value)}>
            <option value="">Velg...</option>
            {trip.members?.filter(m => m.role !== 'LEADER').map(m => (
              <option key={m.user_id} value={m.user_id}>{m.first_name} {m.last_name} ({m.username})</option>
            ))}
          </select>
          <button className="btn btn-small btn-primary" style={{marginTop:8}} onClick={assignBooker}>Utpek som booker</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{fontWeight:700,marginBottom:12}}>{t('members')}</h3>
        {trip.members?.map(m => (
          <div key={m.user_id} className="list-item">
            <div className="avatar">{(m.first_name || '?')[0]}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>{m.first_name} {m.last_name}</div>
              <div style={{fontSize:12,color:'var(--text-light)'}}>@{m.username} | {m.role}</div>
            </div>
            {m.role !== 'LEADER' && (
              <button className="btn btn-small btn-danger" onClick={() => removeMember(m.user_id)}>Fjern</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
