import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Search, X, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, User, Shield, Info, ExternalLink, Ban, Flag, ChevronRight, LayoutGrid } from 'lucide-react';

// --- Custom Node Component ---
const CustomNode = ({ data }) => (
  <div style={{
    width: 90, height: 90, borderRadius: '50%',
    border: data.flagged ? '2px solid #CC0000' : '2px solid #9CA3AF',
    background: data.flagged ? '#FFF0F0' : '#FFFFFF',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', cursor: 'pointer',
    boxShadow: data.flagged ? '0 0 12px rgba(204,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.1)'
  }}>
    {data.flagged && (
      <div style={{
        position:'absolute', top:-6, right:-6,
        background:'#CC0000', borderRadius:'50%',
        width:18, height:18, display:'flex',
        alignItems:'center', justifyContent:'center',
        fontSize:10, color:'white', fontWeight:'bold'
      }}>!</div>
    )}
    <div style={{fontSize:20, marginBottom:2}}>
      {data.flagged ? '⚠️' : '👤'}
    </div>
    <div style={{
      fontSize:9, fontWeight:'bold', textAlign:'center',
      color: data.flagged ? '#CC0000' : '#374151',
      padding:'0 6px', lineHeight:1.2
    }}>{data.name}</div>
    <div style={{
      fontSize:8, color:'#9CA3AF',
      textAlign:'center', padding:'0 4px'
    }}>{data.upi}</div>
    <Handle type="source" position={Position.Right} 
      style={{background:'transparent', border:'none'}} />
    <Handle type="target" position={Position.Left}
      style={{background:'transparent', border:'none'}} />
  </div>
);

const nodeTypes = { custom: CustomNode };

// Dynamic data will be loaded from the API
const initialNodes = [];
const initialEdges = [];

// --- Inner Component ---
function UpiGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();

  const API_BASE = 'http://localhost:5000/api';

  const fetchGraph = useCallback((focus = null) => {
    setLoading(true);
    let url = `${API_BASE}/upi-graph`;
    if (focus) url += `?focus=${encodeURIComponent(focus)}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        setNodes(data.nodes);
        setEdges(data.edges);
        setLoading(false);
        // Fit view will be handled in a separate useEffect or via a ref to avoid dependency cycles
      })
      .catch(err => {
        console.error('Error fetching graph data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [API_BASE, setNodes, setEdges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => fitView({ duration: 800 }), 200);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitView]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const handleSearch = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      fetchGraph();
      return;
    }
    fetchGraph(query);
  };

  const handleReset = () => {
    setSearchQuery('');
    fetchGraph();
    setSelectedNode(null);
  };

  const handleAction = (action) => {
    alert(`${action} successful for ${selectedNode.data.name}`);
    if (action === 'Close') setSelectedNode(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', marginLeft: '60px', background: '#F9FAFB', fontSize: '18px', fontWeight: 'bold', color: '#6B7280' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '10px' }}>Loading Investigation Graph...</div>
          <div style={{ fontSize: '14px', fontWeight: 'normal' }}>Processing transactions and building chains</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', marginLeft: '60px', background: '#F9FAFB', color: '#CC0000' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Error Loading Graph Data</div>
          <div style={{ fontSize: '14px' }}>{error}</div>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '8px 16px', background: '#CC0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      marginLeft: '60px', 
      overflow: 'hidden',
      background: '#F9FAFB'
    }}>
      {/* Search Bar Row */}
      <div style={{ 
        height: '60px', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '12px 20px', 
        background: 'white', 
        borderBottom: '1px solid #E5E7EB',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '14px', fontWeight: 'bold', minWidth: '160px' }}>
          <LayoutGrid size={18} style={{ color: '#CC0000' }} />
          UPI Graph Explorer
        </div>
        
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input 
            type="text" 
            placeholder="Search by name or UPI ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              width: '100%',
              padding: '8px 12px 8px 40px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <button 
          onClick={handleSearch}
          style={{
            padding: '8px 24px',
            background: '#CC0000',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Search
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleReset}
            title="Reset Everything"
            style={{ padding: '8px 12px', border: '1px solid #E5E7EB', background: 'white', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6B7280' }}
          >
            <RotateCcw size={18} />
            Reset
          </button>
          <div style={{ width: '1px', background: '#E5E7EB', margin: '0 4px' }} />
          <button 
            onClick={() => zoomIn()}
            title="Zoom In"
            style={{ padding: '8px', border: '1px solid #E5E7EB', background: 'white', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ZoomIn size={18} />
          </button>
          <button 
            onClick={() => zoomOut()}
            title="Zoom Out"
            style={{ padding: '8px', border: '1px solid #E5E7EB', background: 'white', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ZoomOut size={18} />
          </button>
        </div>
      </div>

      {/* Legend Row */}
      <div style={{ 
        height: '40px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '24px', 
        padding: '8px 20px', 
        background: '#F9FAFB', 
        borderBottom: '1px solid #E5E7EB',
        fontSize: '12px',
        color: '#555'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#CC0000' }} />
          <span>Flagged / Suspicious</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#9CA3AF' }} />
          <span>Normal Account</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '2px', background: '#CC0000' }} />
          <span>Flagged Transaction</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '2px', background: '#9CA3AF' }} />
          <span>Normal Transaction</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          width: selectedNode ? 'calc(100% - 300px)' : '100%', 
          height: '100%', 
          position: 'relative',
          transition: 'width 0.3s ease'
        }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls showZoom={false} />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Right Panel */}
        <div style={{ 
          width: selectedNode ? '300px' : '0',
          height: '100%',
          background: 'white',
          borderLeft: selectedNode ? '1px solid #E5E7EB' : 'none',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          right: 0,
          top: 0
        }}>
          {selectedNode && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{selectedNode.data.name}</h3>
                <button onClick={() => setSelectedNode(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ 
                padding: '4px 12px', 
                background: selectedNode.data.flagged ? '#FFF0F0' : '#F0FDF4',
                color: selectedNode.data.flagged ? '#CC0000' : '#166534',
                borderRadius: '99px',
                fontSize: '12px',
                fontWeight: 'bold',
                width: 'fit-content'
              }}>
                {selectedNode.data.flagged ? 'Suspicious Account' : 'Normal Account'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>UPI ID</div>
                  <div style={{ fontSize: '14px', fontStyle: 'italic', fontWeight: 'bold', color: '#374151' }}>{selectedNode.data.upi}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Bank</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>IndusInd Bank</div>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Total Sent</div>
                     <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#CC0000' }}>₹1,50,000</div>
                   </div>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Total Received</div>
                     <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#166534' }}>₹45,000</div>
                   </div>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px' }}>Connected Accounts</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map(e => {
                      const otherId = e.source === selectedNode.id ? e.target : e.source;
                      const otherNode = nodes.find(n => n.id === otherId);
                      return (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '10px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid #F3F4F6' }}>
                          <span style={{ fontWeight: '500' }}>{otherNode?.data.name}</span>
                          <span style={{ fontWeight: 'bold', color: '#6B7280' }}>{e.label}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto', paddingBottom: '20px' }}>
                <button 
                  onClick={() => handleAction('Blocking')}
                  style={{ width: '100%', padding: '12px', background: '#CC0000', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Block Account
                </button>
                <button 
                  onClick={() => handleAction('Flagging')}
                  style={{ width: '100%', padding: '12px', background: '#FBBF24', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Flag for Review
                </button>
                <button 
                  onClick={() => handleAction('Close')}
                  style={{ width: '100%', padding: '12px', background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Page Wrapper with Provider ---
export default function UpiGraphExplorer() {
  return (
    <ReactFlowProvider>
      <UpiGraph />
    </ReactFlowProvider>
  );
}
