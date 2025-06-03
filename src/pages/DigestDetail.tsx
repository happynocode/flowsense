
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Clock, ExternalLink, Calendar, Play, FileText } from 'lucide-react';
import { digestsApi } from '../services/api';
import { Digest } from '../types';
import { useToast } from '../hooks/use-toast';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AudioPlayer from '../components/digests/AudioPlayer';

const DigestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const defaultTab = searchParams.get('tab') === 'audio' ? 'audio' : 'reading';

  useEffect(() => {
    if (id) {
      fetchDigest(id);
    }
  }, [id]);

  const fetchDigest = async (digestId: string) => {
    try {
      setLoading(true);
      const data = await digestsApi.getDigest(digestId);
      setDigest(data);
      
      // Mark as read
      if (!data.isRead) {
        await digestsApi.markDigestAsRead(digestId);
        setDigest(prev => prev ? { ...prev, isRead: true } : null);
      }
    } catch (error) {
      toast({
        title: "Failed to load digest",
        description: "There was an error loading this digest.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPublishedDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTotalReadingTime = (digest: Digest) => {
    return digest.summaries.reduce((total, summary) => total + summary.readingTime, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading digest..." />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Digest not found</h3>
            <p className="text-gray-500 mb-4">
              The digest you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/digests">
              <Button>Back to Digests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/digests">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Digests
            </Button>
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {formatDate(digest.date)}
                </span>
                {!digest.isRead && (
                  <Badge className="bg-blue-100 text-blue-800">New</Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {digest.title}
              </h1>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
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
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reading">
              <FileText className="h-4 w-4 mr-2" />
              Reading
            </TabsTrigger>
            <TabsTrigger value="audio" disabled={!digest.audioUrl}>
              <Play className="h-4 w-4 mr-2" />
              Audio
            </TabsTrigger>
          </TabsList>

          {/* Reading Tab */}
          <TabsContent value="reading" className="space-y-6">
            {digest.summaries.map((summary) => (
              <Card key={summary.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">{summary.sourceName}</Badge>
                        <span className="text-sm text-gray-500">
                          {formatPublishedDate(summary.publishedAt)}
                        </span>
                        <span className="text-sm text-gray-500">
                          • {summary.readingTime} min read
                        </span>
                      </div>
                      <CardTitle className="text-xl mb-2">{summary.title}</CardTitle>
                    </div>
                    <a
                      href={summary.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: summary.content }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Audio Tab */}
          <TabsContent value="audio">
            {digest.audioUrl ? (
              <div className="max-w-md mx-auto">
                <AudioPlayer
                  audioUrl={digest.audioUrl}
                  title={digest.title}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Audio not available
                  </h3>
                  <p className="text-gray-500">
                    This digest doesn't have an audio version available.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DigestDetail;
