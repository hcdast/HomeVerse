import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import searchService, { SearchResult } from '../services/searchService';
import SearchBar from '../components/SearchBar';
import './Search.css';

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState<'all' | 'article' | 'file' | 'album'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);

  // 加载搜索结果
  const performSearch = async () => {
    if (!keyword.trim()) return;

    try {
      setLoading(true);
      const data = await searchService.search({
        keyword: keyword.trim(),
        type: typeFilter,
        page,
        limit: 20,
      });
      setResults(data.results);
      setTotal(data.total);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载热门标签
  const loadPopularTags = async () => {
    try {
      const tags = await searchService.getPopularTags(10);
      setPopularTags(tags);
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  };

  useEffect(() => {
    loadPopularTags();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setKeyword(q);
    }
  }, [searchParams]);

  useEffect(() => {
    if (keyword) {
      performSearch();
    }
  }, [keyword, typeFilter, page]);

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword);
    setPage(1);
    navigate(`/search?q=${encodeURIComponent(newKeyword)}`);
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'article':
        navigate(`/articles?id=${result.id}`);
        break;
      case 'file':
        navigate(`/files?id=${result.id}`);
        break;
      case 'album':
        navigate(`/albums?id=${result.id}`);
        break;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      article: '📝',
      file: '📄',
      album: '📷',
      photo: '🖼️',
    };
    return icons[type] || '📁';
  };

  const getTypeName = (type: string) => {
    const names: { [key: string]: string } = {
      article: '文章',
      file: '文件',
      album: '相册',
      photo: '照片',
    };
    return names[type] || '未知';
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>搜索</h1>
        <SearchBar onSearch={handleSearch} autoFocus={!keyword} />
      </div>

      {!keyword ? (
        <div className="search-suggestions">
          <h2>热门标签</h2>
          <div className="tags-cloud">
            {popularTags.map((tag) => (
              <button
                key={tag.tag}
                className="tag-button"
                onClick={() => handleSearch(tag.tag)}
              >
                {tag.tag} ({tag.count})
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="search-filters">
            <button
              className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('all');
                setPage(1);
              }}
            >
              全部
            </button>
            <button
              className={`filter-btn ${typeFilter === 'article' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('article');
                setPage(1);
              }}
            >
              📝 文章
            </button>
            <button
              className={`filter-btn ${typeFilter === 'file' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('file');
                setPage(1);
              }}
            >
              📄 文件
            </button>
            <button
              className={`filter-btn ${typeFilter === 'album' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('album');
                setPage(1);
              }}
            >
              📷 相册
            </button>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>搜索中...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>未找到相关内容</p>
              <p className="empty-hint">试试其他关键词吧</p>
            </div>
          ) : (
            <>
              <div className="search-info">
                找到 {total} 个结果
              </div>

              <div className="search-results">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="search-result-card"
                    onClick={() => handleResultClick(result)}
                  >
                    {result.thumbnail && (
                      <div className="result-thumbnail">
                        <img src={result.thumbnail} alt={result.title} />
                      </div>
                    )}
                    <div className="result-content">
                      <div className="result-header">
                        <span className="result-type">
                          {getTypeIcon(result.type)} {getTypeName(result.type)}
                        </span>
                        <span className="result-time">{formatTime(result.createdAt)}</span>
                      </div>
                      <h3 className="result-title">{result.title}</h3>
                      {result.description && (
                        <p className="result-description">{result.description}</p>
                      )}
                      {result.author && (
                        <div className="result-author">
                          作者: {result.author.username}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {total > 20 && (
                <div className="pagination">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn-secondary"
                  >
                    上一页
                  </button>
                  <span className="page-info">
                    第 {page} 页 / 共 {Math.ceil(total / 20)} 页
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(total / 20)}
                    className="btn-secondary"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Search;

