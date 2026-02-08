import { useState, useEffect, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';

interface ProjectData {
  nodes: Node[];
  edges: Edge[];
  name: string;
}

export function useAutoSave(
  data: ProjectData,
  projectId: string | null,
  session: any = null, 
  isLoading: boolean = false
) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('unsaved');
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  
  const hasInitialized = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wasLoadingRef = useRef(false);

  const saveToDatabase = useCallback(async (currentData: ProjectData) => {
    // Guard Clause
    if (!projectId || !session?.user?.email) return;

    try {
      setSaveStatus('saving');

      // ✅ PAYLOAD: Yahan 'const payload' define hai
      const payload = {
          user_email: session.user.email, // Legacy key
          projectId: projectId,
          name: currentData.name,
          nodes: currentData.nodes,
          edges: currentData.edges
      };

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://manavmerja-nebula-backend-live.hf.space";
      
      const response = await fetch(`${API_BASE}/api/v1/projects/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Auto-save failed');

      setSaveStatus('saved');
      setLastSavedTime(new Date());
    } catch (error) {
      console.error('[Auto-Save] ❌ Error:', error);
      setSaveStatus('error');
    }
  }, [projectId, session]);

  // --- EFFECT LOGIC (No changes here, standard logic) ---
  useEffect(() => {
    if (!projectId) return;
    if (isLoading) { wasLoadingRef.current = true; return; }
    
    if (wasLoadingRef.current) { 
        wasLoadingRef.current = false; 
        hasInitialized.current = false; 
    }

    if (!hasInitialized.current) { 
        hasInitialized.current = true; 
        return; 
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    setSaveStatus('saving');
    timerRef.current = setTimeout(() => {
      saveToDatabase(data);
    }, 2000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, projectId, isLoading, saveToDatabase]);

  // Reset on ID change
  useEffect(() => {
    hasInitialized.current = false;
    wasLoadingRef.current = false;
  }, [projectId]);

  return { saveStatus, lastSavedTime };
}