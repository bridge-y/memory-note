import { Octokit } from "@octokit/core";
import type { AppendNote, Note, StorageAdapter } from "../StorageAdapter";

// noteKey is a label name used for filtering issues
// example: "inbox" for filtering issues with label "inbox"
export const createGitHubIssueStorage = ({
    token,
    owner,
    repo,
    deleteMode = "CLOSE"
}: {
    token: string;
    owner: string;
    repo: string;
    deleteMode?: "DELETE" | "CLOSE";
}): StorageAdapter => {
    const octokit = new Octokit({ auth: token });

    return {
        async getNotes(label: string): Promise<Note[]> {
            let response;
            if (label !== "_all") {
                response = await octokit.request("GET /repos/{owner}/{repo}/issues", {
                    owner,
                    repo,
                    labels: label,
                    state: "open"
                });
            } else {
                response = await octokit.request("GET /repos/{owner}/{repo}/issues", {
                    owner,
                    repo,
                    state: "open"
                });
            }
            return response.data.map((issue: { id: number; title: string; updated_at: string }) => ({
                id: String(issue.id),
                message: issue.title,
                timestamp: new Date(issue.updated_at).getTime()
            }));
        },
        async appendNote(label: string, note: AppendNote): Promise<Note> {
            let response;
            // if _all is set to label, note will have no label
            if (label !== "_all") {
                response = await octokit.request("POST /repos/{owner}/{repo}/issues", {
                    owner,
                    repo,
                    title: note.message,
                    labels: [label]
                });
            } else {
                response = await octokit.request("POST /repos/{owner}/{repo}/issues", {
                    owner,
                    repo,
                    title: note.message
                });
            }
            const issue = response.data;
            return {
                id: String(issue.id),
                message: note.message,
                timestamp: new Date(issue.created_at).getTime()
            };
        },
        async deleteNote(_: string, id: Note["id"]): Promise<Note> {
            const response = await octokit.request("GET /repos/{owner}/{repo}/issues/{issue_number}", {
                owner,
                repo,
                issue_number: Number(id)
            });
            const issue = response.data;

            if (deleteMode === "CLOSE") {
                await octokit.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
                    owner,
                    repo,
                    issue_number: Number(id),
                    state: "closed"
                });
            } else {
                await octokit.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}", {
                    owner,
                    repo,
                    issue_number: Number(id)
                });
            }
            return {
                id: String(issue.id),
                message: issue.title,
                timestamp: new Date(issue.updated_at).getTime()
            };
        }
    };
};
