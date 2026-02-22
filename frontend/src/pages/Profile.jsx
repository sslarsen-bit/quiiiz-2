import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { api } from '../api/client';
import { t } from '../i18n';

const COUNTRY_FLAGS = {
  ES: '🇪🇸', IT: '🇮🇹', GR: '🇬🇷', PT: '🇵🇹',
  HR: '🇭🇷', TH: '🇹🇭', FR: '🇫🇷', TR: '🇹🇷',
  NO: '🇳🇴', SE: '🇸🇪', DK: '🇩🇰', DE: '🇩🇪', US: '🇺🇸', GB: '🇬🇧',
};

const PLACE_GRADIENTS = [
  'linear-gradient(135deg, #e74c3c, #f39c12)',
  'linear-gradient(135deg, #3498db, #2ecc71)',
  'linear-gradient(135deg, #9b59b6, #e74c3c)',
  'linear-gradient(135deg, #1abc9c, #3498db)',
  'linear-gradient(135deg, #f39c12, #e74c3c)',
  'linear-gradient(135deg, #2ecc71, #3498db)',
];

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const flags = useFeatureFlags();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [tab, setTab] = useState('posts');
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);

  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (isOwnProfile) {
          const me = await api.get('/auth/me');
          const socialData = await api.get(`/social/profile/${user.id}`).catch(() => ({ posts: [], ratings: [], visitedPlaces: [] }));
          setProfileData({ ...me, ...socialData });
          const f = await api.get('/social/friends').catch(() => []);
          setFriends(f);
          const p = await api.get('/social/friends/pending').catch(() => []);
          setPending(p);
          const t = await api.get('/trips').catch(() => []);
          setTrips(t);
        } else {
          const data = await api.get(`/social/profile/${userId}`);
          setProfileData(data);
        }
      } catch {} finally { setLoading(false); }
    };
    fetchProfile();
  }, [userId, user?.id]);

  const sendFriendRequest = async (friendId) => {
    await api.post('/social/friends/request', { friend_user_id: friendId });
    alert('Venneforespørsel sendt!');
  };

  const acceptFriend = async (friendshipId) => {
    await api.put(`/social/friends/${friendshipId}/accept`);
    const f = await api.get('/social/friends');
    setFriends(f);
    const p = await api.get('/social/friends/pending');
    setPending(p);
  };

  const verifyEmail = async () => {
    await api.post('/auth/verify-email');
    const me = await api.get('/auth/me');
    setProfileData(prev => ({ ...prev, ...me }));
  };

  if (loading) return <div className="spinner" />;
  if (!profileData) return <div className="page"><p>Profil ikke funnet</p></div>;

  const acceptedFriends = friends.filter(f => f.status === 'ACCEPTED');
  const visitedPlaces = profileData.visitedPlaces || [];
  const posts = profileData.posts || [];
  const ratings = profileData.ratings || [];

  return (
    <div className="page fade-in">
      {/* Profile Header - Instagram style */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {/* Cover gradient */}
        <div className="profile-cover" />

        <div className="profile-header">
          {/* Avatar */}
          <div className="profile-avatar-wrapper">
            <div className="avatar avatar-lg" style={{ margin: '0 auto' }}>
              {(profileData.first_name || '?')[0]}
            </div>
          </div>

          {/* Name & username */}
          <h2 style={{ fontWeight: 800, fontSize: 22, marginTop: 14 }}>
            {profileData.first_name} {profileData.last_name}
          </h2>
          <div style={{ color: 'var(--text-light)', fontSize: 14, fontWeight: 500 }}>
            @{profileData.username}
          </div>

          {/* Email verification */}
          {isOwnProfile && (
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!profileData.email_verified ? (
                <button className="btn btn-small btn-warning" onClick={verifyEmail}>
                  Verifiser e-post
                </button>
              ) : (
                <span className="badge badge-success">Verifisert</span>
              )}
              <Link to="/edit-profile" className="btn btn-small btn-secondary">
                Rediger profil
              </Link>
            </div>
          )}

          {/* Friend actions */}
          {!isOwnProfile && !profileData.isFriend && (
            <button className="btn btn-small btn-primary" style={{ marginTop: 14, maxWidth: 200, margin: '14px auto 0' }} onClick={() => sendFriendRequest(userId)}>
              Legg til venn
            </button>
          )}
          {!isOwnProfile && profileData.isFriend && (
            <span className="badge badge-success" style={{ marginTop: 14 }}>Venner</span>
          )}

          {/* Stats row */}
          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-num">{posts.length}</div>
              <div className="profile-stat-label">Innlegg</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-num">{acceptedFriends.length}</div>
              <div className="profile-stat-label">Venner</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-num">{visitedPlaces.length}</div>
              <div className="profile-stat-label">Steder</div>
            </div>
            {isOwnProfile && (
              <div className="profile-stat">
                <div className="profile-stat-num">{trips.length}</div>
                <div className="profile-stat-label">Turer</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending friend requests */}
      {isOwnProfile && pending.length > 0 && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>
            Venneforespørsler ({pending.length})
          </h3>
          {pending.map(p => (
            <div key={p.friendship_id} className="list-item">
              <div className="avatar avatar-sm">{(p.first_name || '?')[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>@{p.username}</div>
              </div>
              <button className="btn btn-small btn-success" onClick={() => acceptFriend(p.friendship_id)}>
                Godta
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      {isOwnProfile && flags.social_enabled && acceptedFriends.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Venner</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 0' }}>
            {acceptedFriends.map(f => (
              <div
                key={f.friendship_id}
                onClick={() => navigate(`/profile/${f.friend_id}`)}
                style={{ textAlign: 'center', cursor: 'pointer', flexShrink: 0, width: 70 }}
              >
                <div className="avatar" style={{ margin: '0 auto 6px', width: 52, height: 52, fontSize: 20 }}>
                  {(f.first_name || '?')[0]}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {f.first_name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <div className={`tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>Innlegg</div>
        <div className={`tab ${tab === 'places' ? 'active' : ''}`} onClick={() => setTab('places')}>Steder</div>
        <div className={`tab ${tab === 'ratings' ? 'active' : ''}`} onClick={() => setTab('ratings')}>Vurderinger</div>
        {isOwnProfile && (
          <div className={`tab ${tab === 'trips' ? 'active' : ''}`} onClick={() => setTab('trips')}>Turer</div>
        )}
      </div>

      {/* Posts tab - Grid layout */}
      {tab === 'posts' && (
        <div>
          {posts.length > 0 ? (
            <>
              {/* Grid of posts with images */}
              {posts.filter(p => p.image_url).length > 0 && (
                <div className="profile-grid">
                  {posts.filter(p => p.image_url).map(post => (
                    <div key={post.id} className="profile-grid-item">
                      <img src={post.image_url} alt="" />
                    </div>
                  ))}
                </div>
              )}
              {/* Text posts */}
              {posts.map(post => (
                <div key={post.id} className="card" style={{ marginTop: posts.filter(p => p.image_url).length > 0 ? 16 : 0 }}>
                  {post.image_url && (
                    <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />
                  )}
                  <p style={{ fontSize: 15 }}>{post.caption}</p>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8, display: 'flex', gap: 12 }}>
                    <span>{post.visibility === 'FRIENDS_ONLY' ? '🔒 Venner' : '🌍 Offentlig'}</span>
                    <span>❤️ {post.like_count || 0}</span>
                    <span>{new Date(post.created_at).toLocaleDateString('no-NO')}</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📸</div>
              <p>Ingen innlegg ennå</p>
            </div>
          )}
        </div>
      )}

      {/* Places tab - Visited places */}
      {tab === 'places' && (
        <div>
          {visitedPlaces.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {visitedPlaces.map((vp, i) => {
                  const countryCode = vp.country_code || '';
                  return (
                    <div
                      key={vp.id}
                      className="visited-place"
                      style={{ flex: '1 1 calc(50% - 4px)', minWidth: 200 }}
                    >
                      <div style={{
                        width: 50, height: 50, borderRadius: 12,
                        background: PLACE_GRADIENTS[i % PLACE_GRADIENTS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, flexShrink: 0,
                      }}>
                        {COUNTRY_FLAGS[countryCode] || '📍'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{vp.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                          {vp.source === 'TRIP_AUTO' ? '✈️ Fra tur' : '📌 Lagt til manuelt'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🗺️</div>
              <p>Ingen steder registrert ennå.<br />Reis på tur for å legge til steder!</p>
            </div>
          )}
        </div>
      )}

      {/* Ratings tab */}
      {tab === 'ratings' && (
        <div>
          {ratings.length > 0 ? (
            ratings.map(r => (
              <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #fef3c7, #fbbf24)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>⭐</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{r.obj_type}</div>
                </div>
                <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16, letterSpacing: 2 }}>
                  {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">⭐</div>
              <p>Ingen vurderinger ennå</p>
            </div>
          )}
        </div>
      )}

      {/* Trips tab - saved trips */}
      {tab === 'trips' && isOwnProfile && (
        <div>
          {trips.length > 0 ? (
            trips.map(trip => (
              <div
                key={trip.id}
                className="trip-card"
                onClick={() => navigate(`/trip/${trip.id}`)}
              >
                <div className="trip-card-header">
                  <div className="trip-card-title">{trip.title}</div>
                  <span className={`badge ${
                    trip.status === 'BOOKED' || trip.status === 'LOCKED' ? 'badge-success' :
                    trip.status === 'VOTING_OPEN' ? 'badge-warning' : 'badge-primary'
                  }`}>
                    {trip.status === 'COLLECTING_SUGGESTIONS' ? 'Planlegger' :
                     trip.status === 'VOTING_OPEN' ? 'Avstemning' :
                     trip.status === 'LOCKED' ? 'Låst' :
                     trip.status === 'BOOKED' ? 'Booket' : trip.status}
                  </span>
                </div>
                <div className="trip-card-meta">
                  {trip.start_date && `📅 ${trip.start_date} — ${trip.end_date}`}
                  {trip.member_count && ` · 👥 ${trip.member_count}`}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">✈️</div>
              <p>Ingen turer ennå</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
