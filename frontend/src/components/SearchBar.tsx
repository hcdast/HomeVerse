import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

interface SearchBarProps {
  onSearch?: (keyword: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const SearchBar = ({ onSearch, placeholder = '搜索文章、文件、相册...', autoFocus = false }: SearchBarProps) => {
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    if (onSearch) {
      onSearch(keyword.trim());
    } else {
      // 跳转到搜索页面
      navigate(`/search?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSearch}>
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="search-input"
      />
      <button type="submit" className="search-button" disabled={!keyword.trim()}>
        🔍
      </button>
    </form>
  );
};

export default SearchBar;

