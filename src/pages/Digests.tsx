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
        title: "✅ Digests Cleared Successfully",
        description: "All digests and content data have been cleared. Sources are preserved.",
      });
    } catch (error) {
      console.error('Failed to clear digests:', error);
      toast({
        title: "❌ Clear Failed",
        description: "An error occurred while clearing digests. Please try again.",
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
        title: "✅ Digest Deleted Successfully",
        description: `"${digest.title}" has been deleted.`,
      });
    } catch (error) {
      console.error('Failed to delete digest:', error);
      toast({
        title: "❌ Delete Failed",
        description: "An error occurred while deleting the digest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialog(null);
    }
  };

  // Ensure digests is always an array before filtering
  const digestsArray = digests || [];

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

  // 生成基于用户时区的digest标题
  const generateDigestTitle = (digest: Digest, userTimezone: string) => {
    // 使用digest创建时间，转换为用户时区的当天日期
    const digestCreatedDate = new Date(digest.createdAt);
    
    // 判断是否为weekly digest（通过原标题或其他方式）
    const isWeekly = digest.title.toLowerCase().includes('weekly');
    
    if (isWeekly) {
      // Weekly digest: "Weekly Digest - M/D/YYYY"
      const formattedDate = digestCreatedDate.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        timeZone: userTimezone
      });
      return `Weekly Digest - ${formattedDate}`;
    } else {
      // Daily digest: "Daily Digest - M/D/YYYY"
      const formattedDate = digestCreatedDate.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        timeZone: userTimezone
      });
      return `Daily Digest - ${formattedDate}`;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading your digests..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Mobile Header */}
        <div className="lg:hidden mb-6">
          <div className="modern-card-elevated p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center text-white shadow-sm">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Your Digests</h1>
                <p className="text-gray-600 text-sm">
                  {digestsArray.length} digest{digestsArray.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            {digestsArray.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowClearDialog(true)}
                className="w-full text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 text-sm"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Digests
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Left-Right Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel - Controls (Desktop only) */}
          <div className="hidden lg:block lg:w-1/3 xl:w-1/4">
            <div className="sticky top-8 space-y-6">
              {/* Enhanced Header */}
              <div className="modern-card-elevated p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center text-white shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Your Digests</h1>
                    <p className="text-gray-600 text-sm">
                      Stay up to date with summaries from your content sources
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Controls */}
              {digestsArray.length > 0 && (
                <div className="modern-card-elevated p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-gradient-primary rounded-full mr-3" />
                    Management Actions
                  </h3>
                  <Button
                    variant="outline"
                    onClick={() => setShowClearDialog(true)}
                    className="w-full text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Digests
                  </Button>
                </div>
              )}

              {/* Enhanced Stats */}
              {digestsArray.length > 0 && (
                <div className="modern-card-elevated p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-gradient-primary rounded-full mr-3" />
                    Statistics
                  </h3>
                  <div className="space-y-4">
                    <div className="stats-card bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="stats-card-icon w-5 h-5" />
                          <span className="text-gray-700 font-medium">Total Digests:</span>
                        </div>
                        <span className="stats-card-value text-xl">{digestsArray.length}</span>
                      </div>
                    </div>
                    <div className="stats-card bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className="w-5 h-5 text-green-600" />
                          <span className="text-gray-700 font-medium">Unread Count:</span>
                        </div>
                        <span className="stats-card-value text-xl text-blue-600">
                          {digestsArray.filter(d => !d.isRead).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Main Content */}
          <div className="w-full lg:w-2/3 xl:w-3/4">

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
          /* Enhanced Digests List */
          <div className="space-y-6">
            {digestsArray.map((digest) => (
              <div key={digest.id} className="modern-card-elevated hover-lift overflow-hidden transition-all duration-200">
                {/* Enhanced Digest Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* Digest Icon */}
                      <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                        <FileText className="h-6 w-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Digest Title */}
                        <div className="mb-2">
                          <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                            {generateDigestTitle(digest, userTimezone)}
                          </h3>
                        </div>
                        
                        {/* Stats Row - Responsive */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <div className="stats-card bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-white/50 shadow-sm">
                            <div className="flex items-center space-x-1">
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span className="text-sm font-semibold text-gray-900">{digest.summaries.length}</span>
                              <span className="text-xs text-gray-600">summaries</span>
                            </div>
                          </div>
                          
                          <div className="stats-card bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-white/50 shadow-sm">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-purple-600" />
                              <span className="text-sm font-semibold text-gray-900">{getTotalReadingTime(digest)}</span>
                              <span className="text-xs text-gray-600">min</span>
                            </div>
                          </div>
                          
                          {digest.audioUrl && (
                            <div className="stats-card bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-white/50 shadow-sm">
                              <div className="flex items-center space-x-1">
                                <Play className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-gray-600">Audio</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Button Row - Mobile responsive */}
                        <div className="flex items-center justify-between">
                          {/* Date and Status */}
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-3 w-3 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {formatDate(digest.createdAt, userTimezone)}
                              </span>
                            </div>
                            {!digest.isRead && (
                              <Badge className="badge-accent text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          
                          {/* Read Button - Always visible */}
                          <Link to={`/digests/${digest.id}`}>
                            <Button 
                              onClick={() => markAsRead(digest)}
                              className="btn-primary bg-gradient-primary hover:shadow-lg text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">Read Digest</span>
                              <span className="sm:hidden ml-2">Read</span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="flex items-center gap-3 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog(digest)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 btn-ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Content Preview */}
                <div className="p-6 space-y-4">
                  {digest.summaries.slice(0, 3).map((summary, index) => (
                    <div key={index} className="modern-card-elevated p-4 hover-lift">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-2 break-words">
                            {summary.title}
                          </h4>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {summary.content.length > 200 
                              ? `${summary.content.substring(0, 200)}...` 
                              : summary.content
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {digest.summaries.length > 3 && (
                    <div className="text-center py-2">
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        and {digest.summaries.length - 3} more summaries...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Enhanced Load More Button */}
            {currentPage < totalPages && (
              <div className="text-center pt-8">
                <Button 
                  variant="outline" 
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-outline hover:bg-blue-50 shadow-md hover:shadow-lg"
                >
                  {loadingMore ? (
                    <>
                      <LoadingIndicator size="sm" />
                      <span className="ml-2">Loading more digests...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Load More Digests</span>
                    </>
                  )}
                </Button>
              </div>
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
              <AlertDialogTitle>Delete Digest</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDialog?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog && handleDeleteDigest(deleteDialog)}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <LoadingIndicator size="sm" />
                    <span className="ml-2">Deleting...</span>
                  </>
                ) : (
                  'Delete'
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