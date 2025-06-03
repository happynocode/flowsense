
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { digestsApi, sourcesApi } from '../services/api';
import { Digest, ContentSource } from '../types';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { FileText, Play, Clock, TrendingUp, Plus } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const [recentDigests, setRecentDigests] = useState<Digest[]>([]);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDigests: 0,
    unreadDigests: 0,
    activeSources: 0,
    totalReadingTime: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Mock data for demonstration since we don't have a real backend
        const mockDigests: Digest[] = [
          {
            id: '1',
            title: 'Tech Weekly Digest',
            date: new Date().toISOString(),
            summaries: [
              {
                id: '1',
                title: 'AI Breakthrough in Natural Language',
                content: 'Recent advances in AI have shown remarkable progress...',
                sourceUrl: 'https://example.com/article1',
                sourceName: 'Tech News',
                publishedAt: new Date().toISOString(),
                readingTime: 5
              }
            ],
            audioUrl: 'https://example.com/audio1.mp3',
            duration: 300,
            isRead: false,
            createdAt: new Date().toISOString()
          }
        ];

        const mockSources: ContentSource[] = [
          {
            id: '1',
            name: 'Tech News',
            url: 'https://technews.com',
            type: 'blog',
            description: 'Latest technology news and updates',
            isActive: true,
            lastScraped: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            name: 'AI Podcast',
            url: 'https://aipodcast.com',
            type: 'podcast',
            description: 'Weekly AI discussions',
            isActive: true,
            lastScraped: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        ];

        setRecentDigests(mockDigests);
        setSources(mockSources);
        
        // Calculate stats safely
        const unreadCount = mockDigests.filter(d => !d.isRead).length;
        const activeSourceCount = mockSources.filter(s => s.isActive).length;
        const totalReadingTime = mockDigests.reduce((acc, digest) => {
          return acc + (digest.summaries || []).reduce((summaryAcc, summary) => summaryAcc + summary.readingTime, 0);
        }, 0);

        setStats({
          totalDigests: mockDigests.length,
          unreadDigests: unreadCount,
          activeSources: activeSourceCount,
          totalReadingTime
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Set empty arrays to prevent undefined errors
        setRecentDigests([]);
        setSources([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's new in your content digest
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Digests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDigests}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.unreadDigests}</p>
                </div>
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <div className="h-3 w-3 bg-orange-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sources</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeSources}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reading Time</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalReadingTime}m</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Digests */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Digests</h2>
              <Link to="/digests">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {recentDigests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No digests yet</h3>
                  <p className="text-gray-500 mb-4">
                    Add some content sources to start generating your daily digests
                  </p>
                  <Link to="/sources">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sources
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentDigests.map((digest) => (
                  <Card key={digest.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {digest.title}
                            </h3>
                            {!digest.isRead && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                New
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            {digest.summaries?.length || 0} summaries • {formatDate(digest.date)}
                          </p>
                          
                          <div className="flex items-center space-x-4">
                            <Link to={`/digests/${digest.id}`}>
                              <Button size="sm">
                                <FileText className="h-4 w-4 mr-1" />
                                Read
                              </Button>
                            </Link>
                            
                            {digest.audioUrl && (
                              <Button variant="outline" size="sm">
                                <Play className="h-4 w-4 mr-1" />
                                Listen
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sources Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Sources</h2>
              <Link to="/sources">
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </Link>
            </div>

            {sources.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 mb-2">No sources added</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add your favorite blogs, podcasts, and news sites
                  </p>
                  <Link to="/sources">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Source
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sources.slice(0, 5).map((source) => (
                  <Card key={source.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {source.name}
                          </h4>
                          <p className="text-sm text-gray-500 truncate">
                            {source.url}
                          </p>
                        </div>
                        <div className={`ml-2 h-2 w-2 rounded-full ${
                          source.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {sources.length > 5 && (
                  <Link to="/sources">
                    <Button variant="ghost" size="sm" className="w-full">
                      View {sources.length - 5} more sources
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
