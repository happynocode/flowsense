
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { sourcesApi } from '../../services/api';
import { ContentSource } from '../../types';
import { Loader2, Check, X } from 'lucide-react';

interface SourceFormProps {
  source?: ContentSource;
  onSuccess: (source: ContentSource) => void;
  onCancel: () => void;
}

const SourceForm = ({ source, onSuccess, onCancel }: SourceFormProps) => {
  const [formData, setFormData] = useState({
    name: source?.name || '',
    url: source?.url || '',
    type: source?.type || 'blog' as const,
    description: source?.description || '',
    isActive: source?.isActive ?? true
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const { toast } = useToast();

  const validateUrl = async (url: string) => {
    if (!url || url === source?.url) {
      setUrlValid(null);
      return;
    }

    setValidating(true);
    try {
      const result = await sourcesApi.validateSource(url);
      setUrlValid(result.valid);
      if (!result.valid) {
        toast({
          title: "URL validation failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setUrlValid(false);
      toast({
        title: "Validation error",
        description: "Could not validate the URL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setFormData(prev => ({ ...prev, url: value }));
    setUrlValid(null);
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateUrl(value);
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (urlValid === false) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL that can be scraped.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let result;
      if (source) {
        result = await sourcesApi.updateSource(source.id, formData);
        toast({
          title: "Source updated",
          description: "Your content source has been updated successfully.",
        });
      } else {
        result = await sourcesApi.addSource(formData);
        toast({
          title: "Source added",
          description: "Your content source has been added successfully.",
        });
      }
      onSuccess(result);
    } catch (error) {
      toast({
        title: source ? "Update failed" : "Creation failed",
        description: "There was an error saving your source. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{source ? 'Edit Source' : 'Add New Source'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Source Name</Label>
            <Input
              id="name"
              placeholder="e.g., TechCrunch, Joe Rogan Podcast"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <div className="relative">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
                className={urlValid === false ? 'border-red-500' : urlValid === true ? 'border-green-500' : ''}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {validating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                {!validating && urlValid === true && <Check className="h-4 w-4 text-green-500" />}
                {!validating && urlValid === false && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Content Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'podcast' | 'blog' | 'news') => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="news">News Site</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this source..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="isActive">
              Active (source will be included in digest generation)
            </Label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || validating || urlValid === false}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {source ? 'Update Source' : 'Add Source'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SourceForm;
