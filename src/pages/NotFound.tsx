
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="glass-card border-0 text-center">
          <CardContent className="p-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
              <Search className="w-10 h-10 text-starlight" />
            </div>
            
            <h1 className="text-6xl font-space-grotesk font-bold text-cosmic-gradient mb-4">
              404
            </h1>
            
            <h2 className="text-2xl font-space-grotesk font-semibold text-starlight mb-4">
              Page Not Found
            </h2>
            
            <p className="text-lunar-grey mb-8 leading-relaxed">
              Looks like you've wandered into uncharted territory. 
              The page you're looking for doesn't exist or may have been moved.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/sources">
                <Button className="btn-cosmic">
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="btn-outline-electric"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
