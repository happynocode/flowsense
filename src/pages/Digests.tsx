import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { FileText, Play, Clock, Search, Calendar, Trash2 } from 'lucide-react';
import { digestsApi, userApi } from '../services/api';
import { Digest } from '../types';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import LoadingIndicator from '../components/common/LoadingIndicator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const Digests = () => {
  const { user, loading: authLoading } = useAuth();
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [userTimezone, setUserTimezone] = useState('UTC');
  const [deleteDialog, setDeleteDialog] = useState<Digest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Only fetch digests when user is authenticated and auth loading is complete
    if (user && !authLoading) {
      console.log('✅ User authenticated, fetching digests...');
      fetchDigests(1);
      loadUserTimezone();
    } else if (!authLoading && !user) {
      console.log('❌ User not authenticated');
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadUserTimezone = async () => {
    try {
      const settings = await userApi.getAutoDigestSettings();
      setUserTimezone(settings.autoDigestTimezone || 'UTC');
    } catch (error) {
      console.error('Failed to load user timezone:', error);
      // 使用默认时区
      setUserTimezone('UTC');
    }
  };

  // Redirect to login if not authenticated and auth loading is complete
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  const fetchDigests = async (page: number, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // 传递用户ID到API调用
      const response = await digestsApi.getDigests(page, 10, user?.id);
      
      if (append) {
        setDigests(prev => [...(prev || []), ...(response.data || [])]);
      } else {
        setDigests(response.data || []);
      }
      
      setCurrentPage(page);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load digests:', error);
      setDigests([]);
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
        (prev || []).map(d => d.id === digest.id ? { ...d, isRead: true } : d)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 🗑️ 清除digests数据功能（保留sources）
  const handleClearDigests = async () => {
    setClearing(true);
    try {
      // 传递用户ID到API调用
      await digestsApi.clearAllDigests(user?.id);
      setDigests([]);
      toast({
        title: "✅ Digests清除成功",
        description: "所有摘要和内容数据已清除，Sources保留。",
      });
    } catch (error) {
      console.error('Failed to clear digests:', error);
      toast({
        title: "❌ 清除失败",
        description: "清除digests时发生错误，请重试。",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
      setShowClearDialog(false);
    }
  };

  // 🗑️ 删除单个digest功能
  const handleDeleteDigest = async (digest: Digest) => {
    setDeleting(true);
    try {
      await digestsApi.deleteDigest(digest.id);
      setDigests(prev => (prev || []).filter(d => d.id !== digest.id));
      toast({
        title: "✅ Digest删除成功",
        description: `"${digest.title}" 已被删除。`,
      });
    } catch (error) {
      console.error('Failed to delete digest:', error);
      toast({
        title: "❌ 删除失败",
        description: "删除digest时发生错误，请重试。",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialog(null);
    }
  };

  // Ensure digests is always an array before filtering
  const digestsArray = digests || [];
  const filteredDigests = digestsArray.filter(digest =>
    digest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    digest.summaries.some(summary => 
      summary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.sourceName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDate = (dateString: string, userTimezone: string = 'UTC') => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: userTimezone
    });
  };

  const getTotalReadingTime = (digest: Digest) => {
    return digest.summaries.reduce((total, summary) => total + summary.readingTime, 0);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading your digests..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Left-Right Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel - Search & Controls */}
          <div className="lg:w-1/3 xl:w-1/4">
            <div className="sticky top-8 space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Digests</h1>
                <p className="text-gray-600">
                  Stay up to date with summaries from your content sources
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search digests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Controls */}
              {digestsArray.length > 0 && (
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-medium text-gray-900 mb-3">管理操作</h3>
                  <Button
                    variant="outline"
                    onClick={() => setShowClearDialog(true)}
                    className="w-full text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清除所有摘要
                  </Button>
                </div>
              )}

              {/* Stats */}
              {digestsArray.length > 0 && (
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-medium text-gray-900 mb-3">统计信息</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">总摘要数:</span>
                      <span className="font-medium">{digestsArray.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">搜索结果:</span>
                      <span className="font-medium">{filteredDigests.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">未读数量:</span>
                      <span className="font-medium text-blue-600">
                        {digestsArray.filter(d => !d.isRead).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Digests List */}
          <div className="lg:w-2/3 xl:w-3/4">

        {/* Empty State */}
        {digestsArray.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No digests yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Your digests will appear here once you start scraping content from your sources. 
                Go to Sources and click "Process All Sources" to get started!
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {formatDate(digest.date, userTimezone)}
                        </span>
                      </div>
                      <CardTitle className="text-xl mb-2 break-words">{digest.title}</CardTitle>
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
                    <div className="flex items-center gap-2">
                      {!digest.isRead && (
                        <Badge className="bg-blue-100 text-blue-800">
                          New
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog(digest)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

        {/* Clear Digests Confirmation Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Digests</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear all your digests and content summaries? 
                This will remove all generated content but keep your sources intact. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearDigests}
                disabled={clearing}
                className="bg-red-600 hover:bg-red-700"
              >
                {clearing ? (
                  <>
                    <LoadingIndicator size="sm" />
                    <span className="ml-2">Clearing...</span>
                  </>
                ) : (
                  'Clear Digests'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Single Digest Confirmation Dialog */}
        <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除摘要</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要删除 "{deleteDialog?.title}" 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog && handleDeleteDigest(deleteDialog)}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <LoadingIndicator size="sm" />
                    <span className="ml-2">删除中...</span>
                  </>
                ) : (
                  '删除'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
                     </AlertDialogContent>
         </AlertDialog>
                    </div>
        </div>
      </div>
    </div>
  );
};

export default Digests;