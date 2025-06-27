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
    <div className="min-h-screen flex items-center justify-center mobile-container">
      <div className="w-full max-w-lg">
        <Card className="modern-card border border-gray-200 text-center shadow-lg">
          <CardContent className="p-8 sm:p-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-primary rounded-full flex items-center justify-center shadow-sm">
              <Search className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-space-grotesk font-bold text-gradient-primary mb-4">
              404
            </h1>
            
            <h2 className="text-xl sm:text-2xl font-space-grotesk font-semibold text-gray-800 mb-4">
              Page Not Found
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed text-sm sm:text-base">
              Looks like you've wandered into uncharted territory. 
              The page you're looking for doesn't exist or may have been moved.
            </p>
            
            <div className="mobile-stack justify-center">
              <Link to="/sources">
                <Button className="btn-primary">
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="btn-secondary"
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
