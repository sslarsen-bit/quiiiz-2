import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { api } from '../api/client';
import { t } from '../i18n';

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

  return (
    <div className="page fade-in">
      {/* Profile header */}
      <div className="card" style={{textAlign:'center'}}>
        <div className="avatar" style={{width:80,height:80,fontSize:32,margin:'0 auto 12px'}}>
          {(profileData.first_name || '?')[0]}
        </div>
        <h2 style={{fontWeight:700}}>{profileData.first_name} {profileData.last_name}</h2>
        <div style={{color:'var(--text-light)',fontSize:14}}>@{profileData.username}</div>

        {isOwnProfile && (
          <div style={{marginTop:12}}>
            {!profileData.email_verified ? (
              <button className="btn btn-small btn-warning" onClick={verifyEmail}>{t('verify_email')} (demo)</button>
            ) : (
              <span className="badge badge-success">{t('verified')}</span>
            )}
            <Link to="/edit-profile" className="btn btn-small btn-secondary" style={{marginTop:8}}>{t('edit_profile')}</Link>
          </div>
        )}

        {!isOwnProfile && !profileData.isFriend && (
          <button className="btn btn-small btn-primary" style={{marginTop:12}} onClick={() => sendFriendRequest(userId)}>
            {t('add_friend')}
          </button>
        )}
        {!isOwnProfile && profileData.isFriend && (
          <span className="badge badge-success" style={{marginTop:12}}>Venner</span>
        )}
      </div>

      {/* Pending friend requests */}
      {isOwnProfile && pending.length > 0 && (
        <div className="card">
          <h3 style={{fontWeight:700,marginBottom:8}}>{t('pending_requests')} ({pending.length})</h3>
          {pending.map(p => (
            <div key={p.friendship_id} className="list-item">
              <div className="avatar avatar-sm">{(p.first_name||'?')[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{p.first_name} {p.last_name}</div>
                <div style={{fontSize:12,color:'var(--text-light)'}}>@{p.username}</div>
              </div>
              <button className="btn btn-small btn-success" onClick={() => acceptFriend(p.friendship_id)}>Godta</button>
            </div>
          ))}
        </div>
      )}

      {/* Friends */}
      {isOwnProfile && flags.social_enabled && (
        <div className="card">
          <h3 style={{fontWeight:700,marginBottom:8}}>{t('friends')} ({friends.filter(f => f.status === 'ACCEPTED').length})</h3>
          {friends.filter(f => f.status === 'ACCEPTED').map(f => (
            <div key={f.friendship_id} className="list-item" style={{cursor:'pointer'}} onClick={() => navigate(`/profile/${f.friend_id}`)}>
              <div className="avatar avatar-sm">{(f.first_name||'?')[0]}</div>
              <div><span style={{fontWeight:600}}>{f.first_name} {f.last_name}</span> <span style={{fontSize:12,color:'var(--text-light)'}}>@{f.username}</span></div>
            </div>
          ))}
          {friends.filter(f => f.status === 'ACCEPTED').length === 0 && <p style={{color:'var(--text-light)',fontSize:14}}>Ingen venner ennå</p>}
        </div>
      )}

      {/* Profile tabs */}
      <div className="tabs">
        <div className={`tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>{t('posts')}</div>
        <div className={`tab ${tab === 'ratings' ? 'active' : ''}`} onClick={() => setTab('ratings')}>{t('ratings')}</div>
        <div className={`tab ${tab === 'trips' ? 'active' : ''}`} onClick={() => setTab('trips')}>{t('trips')}</div>
      </div>

      {tab === 'posts' && (
        <div>
          {(profileData.posts || []).map(post => (
            <div key={post.id} className="card">
              {post.image_url && <img src={post.image_url} alt="" style={{width:'100%',borderRadius:8,marginBottom:8}} />}
              <p>{post.caption}</p>
              <div style={{fontSize:12,color:'var(--text-light)',marginTop:4}}>
                {post.visibility === 'FRIENDS_ONLY' ? t('friends_only') : t('public')} | {post.like_count || 0} likes | {new Date(post.created_at).toLocaleDateString('no-NO')}
              </div>
            </div>
          ))}
          {(profileData.posts || []).length === 0 && <p style={{color:'var(--text-light)',textAlign:'center',padding:20}}>Ingen innlegg ennå</p>}
        </div>
      )}

      {tab === 'ratings' && (
        <div>
          {(profileData.ratings || []).map(r => (
            <div key={r.id} className="list-item">
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{r.name}</div>
                <div style={{fontSize:12,color:'var(--text-light)'}}>{r.obj_type}</div>
              </div>
              <div style={{color:'#f59e0b',fontWeight:700}}>{'★'.repeat(r.stars)}{'☆'.repeat(5-r.stars)}</div>
            </div>
          ))}
          {(profileData.ratings || []).length === 0 && <p style={{color:'var(--text-light)',textAlign:'center',padding:20}}>Ingen vurderinger ennå</p>}
        </div>
      )}

      {tab === 'trips' && (
        <div>
          {(profileData.visitedPlaces || []).map(vp => (
            <div key={vp.id} className="list-item">
              <div style={{fontWeight:600}}>{vp.name}</div>
              <div className="badge badge-primary" style={{marginLeft:8}}>{vp.source === 'TRIP_AUTO' ? 'Fra tur' : 'Manuell'}</div>
            </div>
          ))}
          {(profileData.visitedPlaces || []).length === 0 && <p style={{color:'var(--text-light)',textAlign:'center',padding:20}}>Ingen steder registrert ennå</p>}
        </div>
      )}
    </div>
  );
}
