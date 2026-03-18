import { Link } from 'react-router-dom';

const NotFound = () => (
  <div
    style={{
      padding: 48,
      textAlign: 'center',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}
  >
    <h1 style={{ margin: 0, fontSize: 72, color: '#ddd' }}>404</h1>
    <h2 style={{ margin: 0, color: '#666' }}>页面不存在</h2>
    <p style={{ margin: 0, color: '#999' }}>您访问的地址不存在或已被移除</p>
    <Link to="/" style={{ color: 'var(--primary, #4a90d9)' }}>
      返回首页
    </Link>
  </div>
);

export default NotFound;
