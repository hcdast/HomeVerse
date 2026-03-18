import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import './Sidebar.css';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  category: string;
}

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar = ({ collapsed = false }: SidebarProps) => {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['工作台']));

  const menuItems: MenuItem[] = [
    // 工作台
    { path: '/', label: '首页', icon: '🏠', category: '工作台' },
    { path: '/announcements', label: '公告板', icon: '📣', category: '工作台' },
    { path: '/digest', label: '动态报告', icon: '📊', category: '工作台' },
    { path: '/chat', label: '家庭聊天', icon: '💬', category: '工作台' },
    { path: '/moments', label: '家庭动态', icon: '📸', category: '工作台' },
    { path: '/calendar', label: '家庭日历', icon: '📅', category: '工作台' },
    { path: '/anniversaries', label: '纪念日', icon: '🎉', category: '工作台' },
    { path: '/todos', label: '待办清单', icon: '✅', category: '工作台' },
    { path: '/reminders', label: '智能提醒', icon: '⏰', category: '工作台' },
    { path: '/goals', label: '家庭目标', icon: '🎯', category: '工作台' },
    { path: '/chores', label: '家务分工', icon: '🧹', category: '工作台' },
    { path: '/voting', label: '家庭投票', icon: '🗳️', category: '工作台' },
    { path: '/challenges', label: '家庭挑战', icon: '🏆', category: '工作台' },
    { path: '/time-capsule', label: '时间胶囊', icon: '📦', category: '工作台' },
    
    // 生活管理
    { path: '/finance', label: '财务记账', icon: '💰', category: '生活管理' },
    { path: '/budgets', label: '预算规划', icon: '📊', category: '生活管理' },
    { path: '/shopping', label: '购物清单', icon: '🛒', category: '生活管理' },
    { path: '/recipes', label: '食谱库', icon: '🍳', category: '生活管理' },
    { path: '/menu-planner', label: '菜单规划', icon: '🍽️', category: '生活管理' },
    { path: '/subscriptions', label: '订阅管理', icon: '💳', category: '生活管理' },
    { path: '/health', label: '健康档案', icon: '🏥', category: '生活管理' },
    { path: '/growth', label: '成长记录', icon: '👶', category: '生活管理' },
    { path: '/contacts', label: '紧急联系人', icon: '📞', category: '生活管理' },
    { path: '/locations', label: '位置分享', icon: '📍', category: '生活管理' },
    { path: '/pets', label: '宠物管理', icon: '🐾', category: '生活管理' },
    { path: '/appliances', label: '家电管理', icon: '🔌', category: '生活管理' },
    { path: '/travels', label: '旅行计划', icon: '✈️', category: '生活管理' },
    { path: '/education', label: '教育管理', icon: '📚', category: '生活管理' },
    
    // 资料库
    { path: '/albums', label: '家庭相册', icon: '📷', category: '资料库' },
    { path: '/files', label: '文件管理', icon: '📁', category: '资料库' },
    { path: '/articles', label: '文章管理', icon: '📝', category: '资料库' },
    { path: '/wiki', label: '知识库', icon: '📖', category: '资料库' },
    { path: '/books', label: '家庭书架', icon: '📚', category: '资料库' },
    { path: '/family-tree', label: '家族树', icon: '🌳', category: '资料库' },
    
    // 工具
    { path: '/favorites', label: '我的收藏', icon: '⭐', category: '工具' },
    { path: '/points', label: '积分中心', icon: '🏅', category: '工具' },
    { path: '/passwords', label: '密码管理', icon: '🔐', category: '工具' },
    { path: '/templates', label: '模板中心', icon: '📋', category: '工具' },
    { path: '/data-transfer', label: '数据管理', icon: '📦', category: '工具' },
    { path: '/ai-tools', label: 'AI创作工具', icon: '✨', category: '工具' },
    { path: '/ai-settings', label: 'AI助手', icon: '🤖', category: '工具' },
    
    // 设置
    { path: '/family-members', label: '成员管理', icon: '👥', category: '设置' },
    { path: '/profile', label: '个人资料', icon: '👤', category: '设置' },
  ];

  // 分类图标
  const categoryIcons: Record<string, string> = {
    '工作台': '📋',
    '生活管理': '🏡',
    '资料库': '📂',
    '工具': '🔧',
    '设置': '⚙️',
  };

  // 按分类分组
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // 检查当前路径是否在某个分类中
  const isCategoryActive = (items: MenuItem[]) => {
    return items.some(item => location.pathname === item.path);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        {Object.entries(groupedItems).map(([category, items]) => {
          const isExpanded = expandedCategories.has(category);
          const isActive = isCategoryActive(items);
          
          return (
            <div key={category} className={`menu-category ${isActive ? 'has-active' : ''}`}>
              <button 
                className={`category-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleCategory(category)}
              >
                <span className="category-icon">{categoryIcons[category]}</span>
                {!collapsed && (
                  <>
                    <span className="category-title">{category}</span>
                    <span className="category-arrow">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </>
                )}
                {isActive && <span className="active-dot"></span>}
              </button>
              
              <nav className={`menu-items ${isExpanded ? 'expanded' : ''}`}>
                {items.map((item, index) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    {!collapsed && <span className="menu-label">{item.label}</span>}
                  </Link>
                ))}
              </nav>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
