import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ArticleList from './pages/ArticleList';
import ArticleDetail from './pages/ArticleDetail';
import Editor from './pages/Editor';
import DarkVeil from './components/reactbits/DarkVeil';

function App() {
  return (
    <Router>
      <div className="min-h-screen relative overflow-hidden">
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
          <DarkVeil 
            hueShift={0} 
            noiseIntensity={0.03} 
            scanlineIntensity={0.02} 
            speed={0.5} 
            scanlineFrequency={200} 
            warpAmount={0.2} 
          />
        </div>
        
        <Navbar />
        
        <main className="container mx-auto px-4 pt-24 pb-12 relative z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/articles" element={<ArticleList />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:id" element={<Editor />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
