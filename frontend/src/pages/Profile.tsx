import { useEffect, useState } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import Loading from '@/components/Loading';
import './Profile.css';

const Profile = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('获取用户资料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="profile-page">
      <h1>个人资料</h1>
      <div className="profile-card">
        <div className="profile-avatar">
          {profile?.avatar ? (
            <img src={profile.avatar} alt="头像" />
          ) : (
            <div className="avatar-placeholder">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="profile-info">
          <div className="info-item">
            <label>用户名</label>
            <div>{profile?.username || user?.username}</div>
          </div>
          <div className="info-item">
            <label>邮箱</label>
            <div>{profile?.email || user?.email}</div>
          </div>
          <div className="info-item">
            <label>角色</label>
            <div>{profile?.role === 'admin' ? '管理员' : '成员'}</div>
          </div>
          <div className="info-item">
            <label>注册时间</label>
            <div>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

