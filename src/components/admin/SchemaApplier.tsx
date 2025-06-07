import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { applyDatabaseSchema } from '../../scripts/applySchema';

export const SchemaApplier: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleApplySchema = async () => {
    setStatus('loading');
    setMessage('');

    try {
      await applyDatabaseSchema();
      setStatus('success');
      setMessage('Database schema applied successfully! You can now use the authentication features.');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to apply database schema');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
          Database Setup
        </CardTitle>
        <CardDescription>
          Apply the database schema to enable authentication and user features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert variant={status === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleApplySchema} 
          disabled={status === 'loading' || status === 'success'}
          className="w-full"
        >
          {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === 'success' ? 'Schema Applied' : 'Apply Database Schema'}
        </Button>
      </CardContent>
    </Card>
  );
};