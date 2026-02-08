import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { Node, Edge } from 'reactflow';
import { useSession } from "next-auth/react";
import { useToast } from '@/context/ToastContext';
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://manavmerja-nebula-backend-live.hf.space";

export function useProjectStorage(
    nodes: Node[],
    edges: Edge[],
    setNodes: Dispatch<SetStateAction<Node[]>>,
    setEdges: Dispatch<SetStateAction<Edge[]>>,
    setProjectName: (name: string) => void
) {
    const { data: session } = useSession();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    // ✅ FIX: 'projectId' yahan define hai taaki sab jagah mile
    const projectId = searchParams.get('id');

    // --- SAVE PROJECT ---
    const saveProject = useCallback(async (customName: string) => {
        if (!session?.user?.email) {
            toast.error("Please login to save! 🔒");
            return;
        }

        setSaving(true);
        toast.info(projectId ? "Updating project..." : "Saving new project...");

        try {
            const resultNode = nodes.find(n => n.id === '3');
            let terraformCode = "";
            if (resultNode?.data?.terraformCode) {
                terraformCode = resultNode.data.terraformCode;
            } else if (resultNode?.data?.output) {
                const parts = resultNode.data.output.split('TERRAFORM CODE:');
                terraformCode = parts.length > 1 ? parts[1].trim() : resultNode.data.output;
            }

            // ✅ PAYLOAD DEFINITION
            const payload = {
                user_email: session.user.email,  // Legacy Schema match
                projectId: projectId,            // Update Logic
                name: customName,
                nodes,
                edges,
                terraform_code: terraformCode
            };

            console.log("📤 Sending Data:", payload);

            const response = await fetch(`${API_BASE}/api/v1/projects/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to save");
            }

            const data = await response.json();

            setProjectName(customName);
            toast.success("Project Saved Successfully! 💾");

            // ✅ URL SYNC: Agar naya project banaya, to URL update karo
            if (!projectId && data.projectId) {
                router.replace(`/?id=${data.projectId}`);
            }

        } catch (error: any) {
            console.error("Save Error:", error);
            toast.error(`Save Failed: ${error.message}`);
        } finally {
            setSaving(false);
        }
    }, [nodes, edges, session, projectId, router, toast, setProjectName]);

    // --- LOAD PROJECT ---
    const loadProject = useCallback(async (pid: string) => {
        if (!pid) return;
        setLoading(true);
        try {
            console.log("Loading project ID:", pid);

            // 👇 Verify ye URL sahi hai: /api/projects/${pid}
            const response = await fetch(`${API_BASE}/api/projects/${pid}`);

            if (!response.ok) throw new Error("Project not found");

            const data = await response.json();

            // 👇 Update State
            if (data.nodes) setNodes(data.nodes);
            if (data.edges) setEdges(data.edges);
            if (data.name) setProjectName(data.name);

            // Terraform Code Restore (Optional)
            if (data.terraformCode) {
                setNodes((nds: Node[]) => nds.map((n: Node) =>
                    n.id === '3' ? { ...n, data: { ...n.data, terraformCode: data.terraformCode } } : n
                ));
            }

            toast.success(`Loaded: ${data.name}`);

        } catch (error: any) {
            console.error("Load Error:", error);
            toast.error("Failed to load project");
        } finally {
            setLoading(false);
        }
    }, [toast, setNodes, setEdges, setProjectName]);

    return { saveProject, loadProject, saving, loading };
}