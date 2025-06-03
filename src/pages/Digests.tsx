
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { FileText, Play, Clock, Search, Calendar } from 'lucide-react';
import { digestsApi } from '../services/api';
import { Digest } from '../types';
import { useToast } from '../hooks/use-toast';
import LoadingIndicator from '../components/common/LoadingIndicator';

const Digests = () => {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDigests(1);
  }, []);

  const fetchDigests = async (page: number, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await digestsApi.getDigests(page, 10);
      
      if (append) {
        setDigests(prev => [...prev, ...response.data]);
      } else {
        setDigests(response.data);
      }
      
      setCurrentPage(page);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      toast({
        title: "Failed to load digests",
        description: "There was an error loading your digests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (currentPage < totalPages && !loadingMore) {
      fetchDigests(currentPage + 1, true);
    }
  };

  const markAsRead = async (digest: Digest) => {
    if (digest.isRead) return;

    try {
      await digestsApi.markDigestAsRead(digest.id);
      setDigests(prev => 
        prev.map(d => d.id === digest.id ? { ...d, isRead: true } : d)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const filteredDigests = digests.filter(digest =>
    digest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    digest.summaries.some(summary => 
      summary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.sourceName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalReadingTime = (digest: Digest) => {
    return digest.summaries.reduce((total, summary) => total + summary.readingTime, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading your digests..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Digests</h1>
          <p className="text-gray-600">
            Stay up to date with summaries from your content sources
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search digests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Empty State */}
        {digests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No digests yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Your digests will appear here once we start processing content from your sources. Check back soon!
              </p>
              <Link to="/sources">
                <Button>
                  Manage Sources
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Digests List */
          <div className="space-y-6">
            {filteredDigests.map((digest) => (
              <Card key={digest.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {formatDate(digest.date)}
                        </span>
                      </div>
                      <CardTitle className="text-xl mb-2">{digest.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>{digest.summaries.length} summaries</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{getTotalReadingTime(digest)} min read</span>
                        </div>
                        {digest.audioUrl && (
                          <div className="flex items-center space-x-1">
                            <Play className="h-4 w-4" />
                            <span>Audio available</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!digest.isRead && (
                      <Badge className="bg-blue-100 text-blue-800">
                        New
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Summary Preview */}
                  <div className="mb-4">
                    <div className="grid gap-2">
                      {digest.summaries.slice(0, 3).map((summary) => (
                        <div key={summary.id} className="flex items-center space-x-2 text-sm">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          <span className="font-medium text-gray-900">{summary.sourceName}:</span>
                          <span className="text-gray-600 truncate">{summary.title}</span>
                        </div>
                      ))}
                      {digest.summaries.length > 3 && (
                        <div className="text-sm text-gray-500 ml-4">
                          +{digest.summaries.length - 3} more summaries
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    <Link to={`/digests/${digest.id}`}>
                      <Button 
                        onClick={() => markAsRead(digest)}
                        className="flex items-center space-x-2"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Read Digest</span>
                      </Button>
                    </Link>
                    
                    {digest.audioUrl && (
                      <Link to={`/digests/${digest.id}?tab=audio`}>
                        <Button variant="outline" className="flex items-center space-x-2">
                          <Play className="h-4 w-4" />
                          <span>Listen</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Load More Button */}
            {currentPage < totalPages && (
              <div className="text-center pt-6">
                <Button 
                  variant="outline" 
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <LoadingIndicator size="sm" />
                      <span className="ml-2">Loading...</span>
                    </>
                  ) : (
                    'Load More Digests'
                  )}
                </Button>
              </div>
            )}

            {/* No Results */}
            {searchTerm && filteredDigests.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500">
                    Try adjusting your search terms or clear the search to see all digests.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Digests;
