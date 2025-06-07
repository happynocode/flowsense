import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, Globe, Mic, FileText } from 'lucide-react';
import { sourcesApi } from '../services/api';
import { ContentSource } from '../types';
import { useToast } from '../hooks/use-toast';
import LoadingIndicator from '../components/common/LoadingIndicator';
import SourceForm from '../components/sources/SourceForm';
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

const Sources = () => {
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<ContentSource | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<ContentSource | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const data = await sourcesApi.getSources();
      setSources(data || []);
    } catch (error) {
      console.error('Failed to load sources:', error);
      setSources([]);
      toast({
        title: "Failed to load sources",
        description: "There was an error loading your content sources.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceSuccess = (source: ContentSource) => {
    if (editingSource) {
      setSources(prev => (prev || []).map(s => s.id === source.id ? source : s));
    } else {
      setSources(prev => [...(prev || []), source]);
    }
    setShowForm(false);
    setEditingSource(null);
  };

  const handleEdit = (source: ContentSource) => {
    setEditingSource(source);
    setShowForm(true);
  };

  const handleDelete = async (source: ContentSource) => {
    try {
      await sourcesApi.deleteSource(source.id);
      setSources(prev => (prev || []).filter(s => s.id !== source.id));
      toast({
        title: "Source deleted",
        description: "The content source has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the source.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog(null);
    }
  };

  const toggleSourceStatus = async (source: ContentSource) => {
    try {
      const updatedSource = await sourcesApi.updateSource(source.id, {
        isActive: !source.isActive
      });
      setSources(prev => (prev || []).map(s => s.id === source.id ? updatedSource : s));
      toast({
        title: updatedSource.isActive ? "Source activated" : "Source deactivated",
        description: updatedSource.isActive 
          ? "This source will be included in future digests."
          : "This source will be excluded from future digests.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "There was an error updating the source.",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: ContentSource['type']) => {
    switch (type) {
      case 'podcast':
        return <Mic className="h-4 w-4" />;
      case 'blog':
        return <FileText className="h-4 w-4" />;
      case 'news':
        return <Globe className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading your sources..." />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SourceForm
            source={editingSource || undefined}
            onSuccess={handleSourceSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingSource(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Ensure sources is always an array before checking length
  const sourcesArray = sources || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Sources</h1>
            <p className="text-gray-600 mt-2">
              Manage your blogs, podcasts, and news sources
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>

        {/* Empty State */}
        {sourcesArray.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No sources yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Add your favorite blogs, podcasts, and news sites to start generating personalized content digests.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Source
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Sources Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sourcesArray.map((source) => (
              <Card key={source.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(source.type)}
                      <CardTitle className="text-lg truncate">{source.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleSourceStatus(source)}
                        className={`h-2 w-2 rounded-full ${
                          source.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={source.isActive ? 'Active' : 'Inactive'}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 truncate">{source.url}</p>
                    {source.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {source.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={source.type === 'podcast' ? 'default' : 'secondary'}>
                        {source.type}
                      </Badge>
                      <Badge variant={source.isActive ? 'default' : 'secondary'}>
                        {source.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Last scraped: {formatDate(source.lastScraped)}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(source)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialog(source)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Source</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDialog?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog && handleDelete(deleteDialog)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Sources;