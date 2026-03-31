import{getSupabase as g}from"./supabase-BzvEkRuZ.js";import{getSupabaseAdmin as Vi}from"./supabase-BzvEkRuZ.js";import{c as k}from"./claudeService-gkIpkG4k.js";import{c as De}from"./calendarService-BbG-iXsD.js";import{generationJobService as Ji}from"./generationJobService-y7Ou6Qub.js";import{p as Be}from"./CCAIGen-C782A_B5.js";import{T as Xt,v as _,b as Zt}from"./useAppStore-BZqj2wt4.js";import{u as Yi}from"./useAppStore-BZqj2wt4.js";import{a as zi,y as Qi}from"./youtubeService-B-c0ofaN.js";import"./index-1EGc7oZz.js";import"./next-compat-CpBYT01Z.js";import"./Card-DV6N-vDn.js";import"./Toast-Die_f1Ix.js";import"./Badge-DobHxfO1.js";import"./Select-InT4J_P1.js";import"./ProgressBar-C37PjnSw.js";import"./useQueryHooks-BEqlzjLx.js";import"./CCSelect-Caqiz6K6.js";import"./newspaper-CNjuwkuL.js";import"./type-SZOE9puI.js";import"./share-2-IQa72d7u.js";import"./calendar-plus-C2TC7IMl.js";import"./mic-kPFKNY4A.js";import"./pen-line-Bn4qKPEy.js";import"./smartphone-D620IOyz.js";function N(){return g()}function b(t){return{data:null,error:t,success:!1}}function O(t){return{data:t,error:null,success:!0}}async function tn(t){var n,e,i,r,o;try{const{email:c,password:s,fullName:a}=t,{data:h,error:p}=await((e=(n=N())==null?void 0:n.auth)==null?void 0:e.signUp({email:c,password:s,options:{data:{full_name:a}}}))??{data:null,error:null};if(p)return b((p==null?void 0:p.message)??"Đăng ký thất bại. Vui lòng thử lại.");const f=(h==null?void 0:h.session)??null,y=((i=h==null?void 0:h.user)==null?void 0:i.id)??null;if(!y)return b("Không thể xác định người dùng sau khi đăng ký. Vui lòng kiểm tra email xác nhận.");const{error:u}=await((o=(r=N())==null?void 0:r.from("profiles"))==null?void 0:o.upsert({id:y,email:c,full_name:a,role:"viewer",avatar_url:null,preferences:null},{onConflict:"id"}))??{error:null};return u&&console.error("[authService.signUp] Không thể tạo profile:",u==null?void 0:u.message),O(f)}catch(c){const s=(c==null?void 0:c.message)??"Đã xảy ra lỗi không xác định khi đăng ký.";return b(s)}}async function nn(t,n){var e,i;try{const{data:r,error:o}=await((i=(e=N())==null?void 0:e.auth)==null?void 0:i.signInWithPassword({email:t,password:n}))??{data:null,error:null};if(o)return b((o==null?void 0:o.message)??"Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.");const c=(r==null?void 0:r.session)??null;return c?O(c):b("Không nhận được phiên đăng nhập. Vui lòng thử lại.")}catch(r){const o=(r==null?void 0:r.message)??"Đã xảy ra lỗi không xác định khi đăng nhập.";return b(o)}}async function en(){var t,n;try{const{error:e}=await((n=(t=N())==null?void 0:t.auth)==null?void 0:n.signOut())??{error:null};return e?b((e==null?void 0:e.message)??"Đăng xuất thất bại. Vui lòng thử lại."):O(null)}catch(e){const i=(e==null?void 0:e.message)??"Đã xảy ra lỗi không xác định khi đăng xuất.";return b(i)}}async function on(t){var n,e;try{const{error:i}=await((e=(n=N())==null?void 0:n.auth)==null?void 0:e.resetPasswordForEmail(t))??{error:null};return i?b((i==null?void 0:i.message)??"Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại."):O(null)}catch(i){const r=(i==null?void 0:i.message)??"Đã xảy ra lỗi không xác định khi đặt lại mật khẩu.";return b(r)}}async function rn(){var t,n;try{const{data:e,error:i}=await((n=(t=N())==null?void 0:t.auth)==null?void 0:n.getSession())??{data:null,error:null};if(i)return b((i==null?void 0:i.message)??"Không thể lấy phiên đăng nhập hiện tại.");const r=(e==null?void 0:e.session)??null;return r?O(r):b("Chưa có phiên đăng nhập nào đang hoạt động.")}catch(e){const i=(e==null?void 0:e.message)??"Đã xảy ra lỗi không xác định khi lấy phiên đăng nhập.";return b(i)}}async function cn(){var t,n,e,i,r,o,c;try{const{data:s,error:a}=await((n=(t=N())==null?void 0:t.auth)==null?void 0:n.getUser())??{data:null,error:null};if(a)return b((a==null?void 0:a.message)??"Không thể xác định người dùng hiện tại.");const h=((e=s==null?void 0:s.user)==null?void 0:e.id)??null;if(!h)return b("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");const{data:p,error:f}=await((c=(o=(r=(i=N())==null?void 0:i.from("profiles"))==null?void 0:r.select("*"))==null?void 0:o.eq("id",h))==null?void 0:c.single())??{data:null,error:null};return f?b((f==null?void 0:f.message)??"Không thể tải thông tin hồ sơ người dùng."):p?O(p):b("Không tìm thấy hồ sơ người dùng.")}catch(s){const a=(s==null?void 0:s.message)??"Đã xảy ra lỗi không xác định khi tải hồ sơ người dùng.";return b(a)}}async function sn(t){var n,e,i,r,o,c,s,a;try{const{data:h,error:p}=await((e=(n=N())==null?void 0:n.auth)==null?void 0:e.getUser())??{data:null,error:null};if(p)return b((p==null?void 0:p.message)??"Không thể xác định người dùng hiện tại.");const f=((i=h==null?void 0:h.user)==null?void 0:i.id)??null;if(!f)return b("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");const{data:y,error:u}=await((a=(s=(c=(o=(r=N())==null?void 0:r.from("profiles"))==null?void 0:o.update({...t,updated_at:new Date().toISOString()}))==null?void 0:c.eq("id",f))==null?void 0:s.select("*"))==null?void 0:a.single())??{data:null,error:null};return u?b((u==null?void 0:u.message)??"Không thể cập nhật hồ sơ người dùng."):y?O(y):b("Cập nhật thành công nhưng không thể tải lại hồ sơ.")}catch(h){const p=(h==null?void 0:h.message)??"Đã xảy ra lỗi không xác định khi cập nhật hồ sơ.";return b(p)}}function an(t){var n,e;try{const{data:i}=((e=(n=N())==null?void 0:n.auth)==null?void 0:e.onAuthStateChange((r,o)=>{t==null||t(r,o??null)}))??{data:null};return(i==null?void 0:i.subscription)??null}catch{return console.error("[authService.onAuthStateChange] Không thể đăng ký lắng nghe trạng thái xác thực."),null}}const oi=Object.freeze(Object.defineProperty({__proto__:null,getProfile:cn,getSession:rn,onAuthStateChange:an,resetPassword:on,signIn:nn,signOut:en,signUp:tn,updateProfile:sn},Symbol.toStringTag,{value:"Module"}));function Y(){return g()}function w(t){return{data:null,error:t,success:!1}}function W(t){return{data:t,error:null,success:!0}}async function hn(t){var n,e,i,r;try{const{data:o,error:c}=await((r=(i=(e=(n=Y())==null?void 0:n.from("cc_notifications"))==null?void 0:e.insert(t))==null?void 0:i.select("*"))==null?void 0:r.single())??{data:null,error:null};return c?w((c==null?void 0:c.message)??"Không thể tạo thông báo. Vui lòng thử lại."):o?W(o):w("Tạo thông báo thành công nhưng không nhận được dữ liệu trả về.")}catch(o){const c=(o==null?void 0:o.message)??"Đã xảy ra lỗi không xác định khi tạo thông báo.";return w(c)}}async function un(t){var n,e,i,r,o;try{const{data:c,error:s}=await((o=(r=(i=(e=(n=Y())==null?void 0:n.from("cc_notifications"))==null?void 0:e.select("*"))==null?void 0:i.eq("user_id",t))==null?void 0:r.eq("is_read",!1))==null?void 0:o.order("created_at",{ascending:!1}))??{data:null,error:null};return s?w((s==null?void 0:s.message)??"Không thể tải thông báo chưa đọc."):W(c??[])}catch(c){const s=(c==null?void 0:c.message)??"Đã xảy ra lỗi không xác định khi tải thông báo chưa đọc.";return w(s)}}async function ln(t){var n,e,i,r,o;try{const{data:c,error:s}=await((o=(r=(i=(e=(n=Y())==null?void 0:n.from("cc_notifications"))==null?void 0:e.update({is_read:!0}))==null?void 0:i.eq("id",t))==null?void 0:r.select("*"))==null?void 0:o.single())??{data:null,error:null};return s?w((s==null?void 0:s.message)??"Không thể đánh dấu thông báo đã đọc."):c?W(c):w("Không tìm thấy thông báo cần cập nhật.")}catch(c){const s=(c==null?void 0:c.message)??"Đã xảy ra lỗi không xác định khi đánh dấu thông báo đã đọc.";return w(s)}}async function gn(t){var n,e,i,r;try{const{error:o}=await((r=(i=(e=(n=Y())==null?void 0:n.from("cc_notifications"))==null?void 0:e.update({is_read:!0}))==null?void 0:i.eq("user_id",t))==null?void 0:r.eq("is_read",!1))??{error:null};return o?w((o==null?void 0:o.message)??"Không thể đánh dấu tất cả thông báo là đã đọc."):W(null)}catch(o){const c=(o==null?void 0:o.message)??"Đã xảy ra lỗi không xác định khi đánh dấu tất cả thông báo đã đọc.";return w(c)}}async function dn(t){var n,e,i,r;try{const{count:o,error:c}=await((r=(i=(e=(n=Y())==null?void 0:n.from("cc_notifications"))==null?void 0:e.select("id",{count:"exact",head:!0}))==null?void 0:i.eq("user_id",t))==null?void 0:r.eq("is_read",!1))??{count:null,error:null};return c?w((c==null?void 0:c.message)??"Không thể đếm số thông báo chưa đọc."):W(o??0)}catch(o){const c=(o==null?void 0:o.message)??"Đã xảy ra lỗi không xác định khi đếm thông báo chưa đọc.";return w(c)}}const ri=Object.freeze(Object.defineProperty({__proto__:null,create:hn,getCount:dn,getUnread:un,markAllRead:gn,markAsRead:ln},Symbol.toStringTag,{value:"Module"}));function mn(){return g()}function at(t){return{data:null,error:t,success:!1}}function pn(t){return{data:t,error:null,success:!0}}async function fn(t){var n,e,i,r;try{const{data:o,error:c}=await((r=(i=(e=(n=mn())==null?void 0:n.from("cc_activity_log"))==null?void 0:e.insert({user_id:t==null?void 0:t.user_id,action:t==null?void 0:t.action,entity_type:t==null?void 0:t.entity_type,entity_id:(t==null?void 0:t.entity_id)??"",metadata:(t==null?void 0:t.metadata)??{},ip_address:(t==null?void 0:t.ip_address)??null}))==null?void 0:i.select("*"))==null?void 0:r.single())??{data:null,error:null};return c?at((c==null?void 0:c.message)??"Không thể ghi nhật ký hoạt động. Vui lòng thử lại."):o?pn(o):at("Ghi nhật ký thành công nhưng không nhận được dữ liệu trả về.")}catch(o){const c=(o==null?void 0:o.message)??"Đã xảy ra lỗi không xác định khi ghi nhật ký hoạt động.";return at(c)}}const ci=Object.freeze(Object.defineProperty({__proto__:null,log:fn},Symbol.toStringTag,{value:"Module"})),si={async list(t={}){try{const n=g(),e=t.page??1,i=t.pageSize??20,r=(e-1)*i;let o=n.from("cc_scripts").select("*",{count:"exact"});t.contentType&&(o=o.eq("content_type",t.contentType)),t.track&&(o=o.eq("track",t.track)),t.pillar&&(o=o.eq("pillar",t.pillar)),t.persona&&(o=o.eq("persona",t.persona)),t.writingMode&&(o=o.eq("writing_mode",t.writingMode)),t.status&&(o=o.eq("status",t.status)),t.createdBy&&(o=o.eq("created_by",t.createdBy)),t.search&&(o=o.ilike("title",`%${t.search}%`));const c=t.sortBy??"created_at",s=t.sortOrder??"desc";o=o.order(c,{ascending:s==="asc"}).range(r,r+i-1);const{data:a,error:h,count:p}=await o;if(h)return{data:null,error:h.message,success:!1};const f=p??0;return{data:{scripts:a??[],total:f,page:e,pageSize:i,totalPages:Math.ceil(f/i)},error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải danh sách kịch bản",success:!1}}},async getById(t){try{const n=g(),{data:e,error:i}=await n.from("cc_scripts").select("*").eq("id",t).single();return i?{data:null,error:i.message,success:!1}:{data:e,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải kịch bản",success:!1}}},async create(t){try{const n=g(),{data:e,error:i}=await n.from("cc_scripts").insert(t).select().single();return i?{data:null,error:i.message,success:!1}:{data:e,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tạo kịch bản",success:!1}}},async update(t,n){try{const e=g(),{data:i,error:r}=await e.from("cc_scripts").update({...n,updated_at:new Date().toISOString()}).eq("id",t).select().single();return r?{data:null,error:r.message,success:!1}:{data:i,error:null,success:!0}}catch(e){return{data:null,error:e instanceof Error?e.message:"Lỗi cập nhật kịch bản",success:!1}}},async archive(t){return this.update(t,{status:"archived"})},async remove(t){try{const n=g(),{error:e}=await n.from("cc_scripts").delete().eq("id",t);return e?{data:null,error:e.message,success:!1}:{data:null,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi xóa kịch bản",success:!1}}},async updateStatus(t,n,e){const i={status:n,updated_by:e};return n==="approved"&&(i.approved_by=e,i.approved_at=new Date().toISOString()),this.update(t,i)},async getDashboardStats(){try{const t=g(),[n,e,i,r]=await Promise.all([t.from("cc_scripts").select("id",{count:"exact",head:!0}),t.from("cc_scripts").select("id",{count:"exact",head:!0}).eq("status","published"),t.from("cc_scripts").select("id",{count:"exact",head:!0}).eq("status","review"),t.from("cc_scripts").select("id",{count:"exact",head:!0}).eq("status","draft")]);return{data:{totalScripts:n.count??0,publishedScripts:e.count??0,pendingReview:i.count??0,drafts:r.count??0},error:null,success:!0}}catch(t){return{data:null,error:t instanceof Error?t.message:"Lỗi tải thống kê",success:!1}}},async duplicate(t,n){const{data:e,error:i}=await this.getById(t);if(i||!e)return{data:null,error:i??"Không tìm thấy kịch bản gốc",success:!1};const r={title:`${e.title} (Bản sao)`,content_type:e.content_type,track:e.track,pillar:e.pillar,persona:e.persona,writing_mode:e.writing_mode,status:"draft",body:e.body,sections:e.sections,emotional_arc:e.emotional_arc,word_count:e.word_count,estimated_duration_seconds:e.estimated_duration_seconds,hook:e.hook,cta:e.cta,tags:e.tags,version:1,parent_script_id:e.id,notes:`Bản sao từ "${e.title}"`,metadata:e.metadata,created_by:n};return this.create(r)}},ai={async getByScriptId(t){try{const n=g(),{data:e,error:i}=await n.from("cc_titles").select("*").eq("script_id",t).order("created_at",{ascending:!1});return i?{data:null,error:i.message,success:!1}:{data:e??[],error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải tiêu đề",success:!1}}},async list(t={}){try{const n=g(),e=t.page??1,i=t.pageSize??20,r=(e-1)*i;let o=n.from("cc_titles").select("*",{count:"exact"});t.contentType&&(o=o.eq("content_type",t.contentType)),t.search&&(o=o.ilike("title_text",`%${t.search}%`)),o=o.order("created_at",{ascending:!1}).range(r,r+i-1);const{data:c,error:s,count:a}=await o;return s?{data:null,error:s.message,success:!1}:{data:{titles:c??[],total:a??0},error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải danh sách tiêu đề",success:!1}}},async create(t){try{const n=g(),{data:e,error:i}=await n.from("cc_titles").insert(t).select().single();return i?{data:null,error:i.message,success:!1}:{data:e,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tạo tiêu đề",success:!1}}},async createBatch(t){try{const n=g(),{data:e,error:i}=await n.from("cc_titles").insert(t).select();return i?{data:null,error:i.message,success:!1}:{data:e??[],error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tạo tiêu đề hàng loạt",success:!1}}},async update(t,n){try{const e=g(),{data:i,error:r}=await e.from("cc_titles").update({...n,updated_at:new Date().toISOString()}).eq("id",t).select().single();return r?{data:null,error:r.message,success:!1}:{data:i,error:null,success:!0}}catch(e){return{data:null,error:e instanceof Error?e.message:"Lỗi cập nhật tiêu đề",success:!1}}},async selectTitle(t,n){try{const e=g();await e.from("cc_titles").update({is_selected:!1}).eq("script_id",n);const{data:i,error:r}=await e.from("cc_titles").update({is_selected:!0,updated_at:new Date().toISOString()}).eq("id",t).select().single();return r?{data:null,error:r.message,success:!1}:{data:i,error:null,success:!0}}catch(e){return{data:null,error:e instanceof Error?e.message:"Lỗi chọn tiêu đề",success:!1}}},async remove(t){try{const n=g(),{error:e}=await n.from("cc_titles").delete().eq("id",t);return e?{data:null,error:e.message,success:!1}:{data:null,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi xóa tiêu đề",success:!1}}}},hi={async list(t={}){try{const n=g(),e=t.page??1,i=t.pageSize??20,r=(e-1)*i;let o=n.from("cc_social_posts").select("*",{count:"exact"});t.platform&&(o=o.eq("platform",t.platform)),t.status&&(o=o.eq("status",t.status)),t.contentType&&(o=o.eq("content_type",t.contentType)),t.scriptId&&(o=o.eq("script_id",t.scriptId)),t.search&&(o=o.ilike("content",`%${t.search}%`)),o=o.order("created_at",{ascending:!1}).range(r,r+i-1);const{data:c,error:s,count:a}=await o;return s?{data:null,error:s.message,success:!1}:{data:{posts:c??[],total:a??0},error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải bài đăng",success:!1}}},async getById(t){try{const n=g(),{data:e,error:i}=await n.from("cc_social_posts").select("*").eq("id",t).single();return i?{data:null,error:i.message,success:!1}:{data:e,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải bài đăng",success:!1}}},async create(t){try{const n=g(),{data:e,error:i}=await n.from("cc_social_posts").insert(t).select().single();return i?{data:null,error:i.message,success:!1}:{data:e,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tạo bài đăng",success:!1}}},async createBatch(t){try{const n=g(),{data:e,error:i}=await n.from("cc_social_posts").insert(t).select();return i?{data:null,error:i.message,success:!1}:{data:e??[],error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tạo chiến dịch",success:!1}}},async update(t,n){try{const e=g(),{data:i,error:r}=await e.from("cc_social_posts").update({...n,updated_at:new Date().toISOString()}).eq("id",t).select().single();return r?{data:null,error:r.message,success:!1}:{data:i,error:null,success:!0}}catch(e){return{data:null,error:e instanceof Error?e.message:"Lỗi cập nhật bài đăng",success:!1}}},async schedule(t,n){return this.update(t,{status:"scheduled",scheduled_at:n})},async markPublished(t,n,e){return this.update(t,{status:"published",published_at:new Date().toISOString(),external_post_id:n??null,external_post_url:e??null})},async remove(t){try{const n=g(),{error:e}=await n.from("cc_social_posts").delete().eq("id",t);return e?{data:null,error:e.message,success:!1}:{data:null,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi xóa bài đăng",success:!1}}},async getCampaignPosts(t,n,e){try{let r=g().from("cc_social_posts").select("*").gte("scheduled_at",t).lte("scheduled_at",n);e&&(r=r.eq("platform",e)),r=r.order("scheduled_at",{ascending:!0});const{data:o,error:c}=await r;return c?{data:null,error:c.message,success:!1}:{data:o??[],error:null,success:!0}}catch(i){return{data:null,error:i instanceof Error?i.message:"Lỗi tải chiến dịch",success:!1}}}},ui={async list(t={}){try{const n=g(),e=t.page??1,i=t.pageSize??20,r=(e-1)*i;let o=n.from("cc_image_prompts").select("*",{count:"exact"});t.status&&(o=o.eq("status",t.status)),t.purpose&&(o=o.eq("purpose",t.purpose)),o=o.order("created_at",{ascending:!1}).range(r,r+i-1);const{data:c,error:s,count:a}=await o;return s?{data:null,error:s.message,success:!1}:{data:{prompts:c??[],total:a??0},error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải prompt hình ảnh",success:!1}}},async getById(t){try{const n=g(),{data:e,error:i}=await n.from("cc_image_prompts").select("*").eq("id",t).single();return i?{data:null,error:i.message,success:!1}:{data:e,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải prompt",success:!1}}},async create(t){try{const n=g(),{data:e,error:i}=await n.from("cc_image_prompts").insert(t).select().single();return i?{data:null,error:i.message,success:!1}:{data:e,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tạo prompt hình ảnh",success:!1}}},async update(t,n){try{const e=g(),{data:i,error:r}=await e.from("cc_image_prompts").update({...n,updated_at:new Date().toISOString()}).eq("id",t).select().single();return r?{data:null,error:r.message,success:!1}:{data:i,error:null,success:!0}}catch(e){return{data:null,error:e instanceof Error?e.message:"Lỗi cập nhật prompt",success:!1}}},async updateStatus(t,n){return this.update(t,{status:n})},async selectImage(t,n){return this.update(t,{selected_image_index:n,status:"approved"})},async remove(t){try{const n=g(),{error:e}=await n.from("cc_image_prompts").delete().eq("id",t);return e?{data:null,error:e.message,success:!1}:{data:null,error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi xóa prompt",success:!1}}},async getByScriptId(t){try{const n=g(),{data:e,error:i}=await n.from("cc_image_prompts").select("*").eq("script_id",t).order("created_at",{ascending:!1});return i?{data:null,error:i.message,success:!1}:{data:e??[],error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải prompt hình ảnh",success:!1}}}},Yt={jennie_mentor:'Jennie ở vai trò người dẫn đường, trầm tĩnh, chia sẻ kinh nghiệm thực chiến. Giọng nói ấm áp nhưng chắc chắn, như một người chị đã đi qua sóng gió và quay lại giúp bạn. Dùng ngôi "mình" hoặc "Jennie" khi kể trải nghiệm cá nhân.',jennie_provocateur:'Jennie đanh thép, brutal honesty, pattern-interrupt, MODE 2 energy. Mở đầu bằng câu gây sốc hoặc sự thật trần trụi mà phần lớn không dám nói. Dùng ngôi "tôi" hoặc "Jennie" với sự tự tin cao.',jennie_storyteller:"Jennie kể chuyện cuốn hút, personal stories, emotional connection. Mỗi bài viết là một hành trình — có mở, thắt nút, cao trào, giải kết. Dùng chi tiết cảm giác, hình ảnh, và đoạn hội thoại nội tâm.",jennie_analyst:"Jennie phân tích dữ liệu, logic, evidence-based, trading focus. Trình bày rõ ràng theo từng lớp: data → insight → hành động. Sử dụng con số cụ thể, phần trăm, ví dụ chart thực.",jennie_motivator:"Jennie truyền cảm hứng, năng lượng cao, empowerment. Nâng tần số người nghe bằng affirmation mạnh mẽ, câu hỏi khai mở, và lời kêu gọi hành động ngay. Giọng rõ ràng, quyết đoán.",jennie_educator:"Jennie giải thích khái niệm phức tạp đơn giản, step-by-step. Đi từ cơ bản đến nâng cao, dùng ví dụ gần gũi đời thường. Đặt câu hỏi dẫn dắt để người nghe tự khám phá.",jennie_confidante:"Jennie thủ thỉ, intimate, healing, vulnerability. Chia sẻ những khoảnh khắc yếu đuối thật sự, nói chậm, nhẹ nhàng. Không phán xét, chỉ đồng hành. Tạo không gian an toàn cho người nghe."},Wt={wealth:"Tài Chính — Trading, LATC Money, chiến lược đầu tư, tư duy triệu phú. Tập trung vào: phân tích thị trường crypto, quản lý vốn, tâm lý giao dịch, và xây dựng tài sản bền vững.",wellness:"Tâm Thức — Thiền, tâm linh, chữa lành, nâng cao tần số. Tập trung vào: thiền định, năng lượng, nghiệp lực, chiêm tinh ý thức, và hành trình thức tỉnh cá nhân.",integration:"Tích Hợp — Lifestyle, cân bằng cuộc sống, ứng dụng thực tế. Tập trung vào: kết nối tài chính và tâm thức, sống có ý thức, ứng dụng spirituality vào đầu tư và ngược lại."},yn={spiritual:"Trụ cột Tâm Linh: năng lượng, tần số, thiền định, chữa lành, chiêm tinh.",trading:"Trụ cột Giao Dịch: phân tích kỹ thuật, chiến lược, quản lý rủi ro, tâm lý trading.",latc_money:"Trụ cột LATC Money: tài chính cá nhân, đầu tư dài hạn, xây dựng tài sản, tư duy tiền bạc.",lifestyle:"Trụ cột Lifestyle: cân bằng cuộc sống, thói quen, sức khỏe, mối quan hệ, phát triển bản thân."},Tn={mode_1_calm:`MODE 1 — CALM & AUTHORITATIVE
Giọng trầm tĩnh, ấm áp, nuôi dưỡng. Như một người chị/cô/thầy chia sẻ bên tách trà.
Nhịp văn chậm, sâu, cho người nghe thời gian thẩm thấu.
Không gây sốc, không áp lực — chỉ dẫn dắt nhẹ nhàng nhưng chắc chắn.`,mode_2_provocative:`MODE 2 — PROVOCATIVE & BOLD
Giọng đanh thép, trực diện, pattern-interrupt. Sự thật trần trụi không đường bọc.
Nhịp văn nhanh, câu ngắn đan xen câu dài tạo tension.
Mở đầu bằng statement gây sốc hoặc câu hỏi đánh thẳng vào suy nghĩ thông thường.`};function bn(){return["GEM Scanner — Công cụ quét tín hiệu crypto, tìm điểm mua bán tối ưu","GEM Vision Board — Bảng tầm nhìn kỹ thuật số, thiết lập mục tiêu và theo dõi hành trình","GEM Tarot — Bài tarot hướng dẫn năng lượng, kết nối trực giác với quyết định đầu tư","GEM Sư Phụ AI — Trợ lý AI tâm thức, hỏi đáp về thiền, năng lượng, và chiến lược sống","Templates giao dịch — Mẫu chiến lược trading đã được kiểm chứng","Paper Trade — Giao dịch thử nghiệm không rủi ro, luyện tập trước khi vào thật","Tần Số Tình Yêu — Khóa chữa lành tình yêu, nâng cao tần số trong mối quan hệ","Master AI — Khóa làm chủ AI, ứng dụng công nghệ vào cuộc sống và kinh doanh","App GEMRAL — Ứng dụng di động GEM, tất cả công cụ trong một nền tảng"].join(`
`)}function kn(){return Xt.map(({en:t,vi:n})=>({en:t,vi:n}))}function Cn(t){switch(t){case"latc":return`CẤU TRÚC LATC (4000-5500 từ):

1. HOOK (500 từ)
   Mở đầu bằng câu chuyện/tình huống gây tò mò. Đặt câu hỏi lớn.
   Tạo gap giữa "điều bạn nghĩ" vs "sự thật".
   Kết hook: "Hôm nay Jennie sẽ chia sẻ [X] sự thật/bí mật/bài học..."

2. PHẦN 1 (600-800 từ)
   Sự thật/Bài học thứ nhất. Bắt đầu bằng statement mạnh.
   1 ví dụ crypto + 1 ví dụ đời sống.
   Rải 1-2 GEM tools tự nhiên trong nội dung.
   Transition: "Ok, đó là sự thật thứ 1. Nhưng..."

3. PHẦN 2 (600-800 từ)
   Sự thật/Bài học thứ hai. Nâng cấp depth từ phần 1.
   Dual examples. GEM tools weaved in.
   Transition tự nhiên sang phần 3.

4. PHẦN 3 (600-800 từ)
   Sự thật/Bài học thứ ba. Cao trào bắt đầu build.
   Dual examples. GEM tools weaved in.
   Transition: "Nhưng đây mới là điều quan trọng nhất..."

5. PHẦN 4 (600-800 từ)
   Sự thật/Bài học thứ tư. Climax — insight sâu nhất.
   Kết nối tất cả các phần trước thành bức tranh lớn.
   Dual examples, đan xen emotional beat.

6. PHẦN 5 (600-800 từ)
   Sự thật/Bài học thứ năm. Resolution & transformation.
   Từ insight → hành động cụ thể cho người nghe.

7. CTA (200-300 từ)
   Giới thiệu khóa học/sản phẩm liên quan TRƯỚC phần closing.
   Giáo dục > Bán hàng. Không áp lực, chỉ gợi mở.
   "Nếu bạn muốn đi sâu hơn..." / "Trong khóa [X], mình chia sẻ chi tiết hơn..."

8. CLOSING (200 từ)
   Touching, nhẹ nhàng, tin tưởng. Gửi năng lượng tích cực.
   "Hẹn gặp lại bạn trong video tiếp theo..."
   Kết bằng affirmation hoặc câu hỏi suy ngẫm.`;case"tmt":return`CẤU TRÚC TMT — THỨC TỈNH TÂM THỨC (4500-5500 từ):

1. INTRO (400-500 từ)
   Đặt bối cảnh tâm linh/năng lượng. Tại sao chủ đề này quan trọng NGAY BÂY GIỜ.
   Kết nối với current energy (mùa, trăng, tiết khí, hoặc sự kiện vũ trụ).

2. TỔNG QUAN (500-600 từ)
   Bird's eye view của chủ đề. Giải thích framework/khái niệm chính.
   Tại sao phần lớn hiểu sai hoặc chưa đủ sâu.

3. PHẦN CHÍNH 1 (600-800 từ)
   Deep dive vào khía cạnh thứ nhất.
   1 ví dụ crypto/tài chính + 1 ví dụ tâm thức/đời sống.
   Rải GEM tools tự nhiên.

4. PHẦN CHÍNH 2 (600-800 từ)
   Deep dive vào khía cạnh thứ hai.
   Dual examples. Tần số là trung tâm giải thích.

5. PHẦN CHÍNH 3 (600-800 từ)
   Deep dive vào khía cạnh thứ ba.
   Connect dots giữa các phần. Emotional build-up.

6. PHẦN CHÍNH 4 (600-800 từ)
   Deep dive vào khía cạnh thứ tư.
   Practical application — làm thế nào áp dụng.

7. CAO TRÀO (400-500 từ)
   Climax — revelation lớn nhất. "Aha moment".
   Kết nối TẤN SỐ + NGHIỆP LỰC + hành động.

8. CLOSING (200-300 từ)
   Nhẹ nhàng, chữa lành, tin tưởng.
   Meditation ngắn hoặc affirmation kết bài.

9. CTA (200-300 từ)
   Đặt SAU closing nhưng TRƯỚC lời chào cuối.
   Giáo dục > Bán hàng. Liên kết sản phẩm với hành trình thức tỉnh.`;case"short_clip":return`CẤU TRÚC SHORT CLIP (75-200 từ, 30-70 giây):

1. PAIN/HOOK (1-2 câu, 5-10 giây)
   Câu mở gây sốc hoặc đau điểm. Pattern-interrupt ngay giây đầu.
   "Bạn có biết vì sao 95% trader thua lỗ?" / "Điều này không ai nói cho bạn..."

2. STORY/CONTEXT (2-3 câu, 10-15 giây)
   Micro-story hoặc bối cảnh ngắn gọn. Tạo emotional hook.

3. INSIGHT (2-3 câu, 10-15 giây)
   Sự thật/bài học chính. Câu trả lời cho pain point.
   Kết nối với tần số hoặc nghiệp lực nếu phù hợp.

4. SOLUTION (1-2 câu, 5-10 giây)
   Hành động cụ thể người xem có thể làm NGAY.

5. CTA (1 câu, 3-5 giây)
   "Follow để xem phần 2" / "Link khóa học trong bio" / "Comment nếu bạn đồng ý"`;case"social_post":return`CẤU TRÚC SOCIAL POST (50-500 từ):

1. HOOK (1-2 câu)
   Câu mở hấp dẫn, scroll-stopping. Emoji phù hợp.

2. NỘI DUNG CHÍNH (3-8 câu)
   Chia sẻ insight, story, hoặc tip. Ngắn gọn, dễ đọc.

3. CTA (1-2 câu)
   Kêu gọi tương tác: comment, share, save.

4. HASHTAGS
   5-15 hashtags phù hợp nền tảng.`;case"news":return`CẤU TRÚC TIN TỨC / BLOG SEO (500-3000 từ):

1. TIÊU ĐỀ SEO (60-70 ký tự, có keyword chính)

2. META DESCRIPTION (150-155 ký tự)

3. TL;DR (2-3 câu cho AI Search / Featured Snippet)

4. MỞ ĐẦU (100-150 từ)
   Lead paragraph: Ai? Cái gì? Khi nào? Tại sao quan trọng?

5. NỘI DUNG CHÍNH (H2/H3 structure)
   Phân tích chuyên sâu, số liệu, nguồn dẫn.

6. KẾT LUẬN
   Tóm tắt 2-3 điểm chính + CTA phù hợp.`}}function li(t){return Yt[t]}function gi(t){return Wt[t]}function vn(){return`10 QUY TẮC VÀNG — Tuân thủ TUYỆT ĐỐI:

① DUAL EXAMPLES: Mỗi concept chính = 1 ví dụ crypto/tài chính + 1 ví dụ đời sống.
   Không bao giờ chỉ có 1 loại ví dụ. Sự kết nối giữa tiền và đời sống là DNA của kênh.

② DẪN VÀO BỐI CẢNH: Trước mỗi ví dụ, dẫn vào bằng:
   "Trong thế giới đầu tư..." / "Ngoài thị trường, trong cuộc sống..."
   "Hãy tưởng tượng bạn đang..." / "Quay lại với crypto..."

③ GEM TOOLS RẢI ĐỀU: Nhắc đến các công cụ GEM xuyên suốt nội dung, rải đều trong từng phần.
   KHÔNG dồn tất cả sản phẩm vào cuối bài. Mỗi phần nên tự nhiên weave 1-2 công cụ.
   Ví dụ: "...và đây chính là lý do mình xây dựng GEM Scanner — để bạn không cần đoán..."

④ TIẾNG VIỆT THUẦN TÚY: Sử dụng tiếng Việt cho mọi thuật ngữ. Không dùng tiếng Anh.
   Bảng chuyển đổi bắt buộc:
`+Sn()+`

⑤ PROSE FLOWING: Viết dạng văn xuôi mượt mà, KHÔNG sử dụng bullet points.
   Không dùng dấu gạch đầu dòng (-), dấu chấm (•), hay dấu sao (*) để liệt kê.
   Thay vào đó, dùng câu chuyển tiếp: "Thứ nhất là...", "Tiếp theo,...", "Và quan trọng nhất,..."

⑥ TẦN SỐ LÀ TRUNG TÂM: Tần số (frequency/vibration) là USP cốt lõi.
   Mọi chủ đề đều phải quay về: "Tần số của bạn quyết định kết quả."
   Trading thua? → Tần số thấp. Mối quan hệ đổ vỡ? → Tần số không match.

⑦ CTA KHÓA HỌC TRƯỚC CLOSING: Luôn đặt phần giới thiệu khóa học/sản phẩm
   TRƯỚC phần closing/lời chào cuối. Không bao giờ kết bài rồi mới bán.

⑧ GIÁO DỤC > BÁN HÀNG: Sản phẩm KHÔNG xuất hiện trong tiêu đề.
   Nội dung phải mang giá trị giáo dục thực sự. Sản phẩm chỉ là phần mở rộng tự nhiên.
   "Nếu bạn muốn đi sâu hơn..." — không bao giờ "Mua ngay" hay "Đăng ký ngay".

⑨ TRANSITION PHRASES: Giữa các phần, dùng câu chuyển tiếp đặc trưng:
   "Ok, đó là sự thật thứ [N]. Nhưng..."
   "Nhưng đây mới là điều quan trọng hơn..."
   "Và bạn biết điều gì sẽ xảy ra tiếp theo không?"

⑩ CLOSING TOUCHING: Phần kết phải nhẹ nhàng, ấm áp, tin tưởng.
   Gửi năng lượng tích cực. Không áp lực, không FOMO.
   "Hẹn gặp lại bạn..." / "Jennie tin bạn..." / "Chúng ta sẽ cùng nhau..."`}function Sn(){return kn().map(({en:n,vi:e})=>`   ${n} → ${e}`).join(`
`)}function _n(){return`THUẬT NGỮ CẤM — Không bao giờ sử dụng:

• "tâm linh" → THAY BẰNG "tâm thức" (kênh tên "Thức Tỉnh Tâm Thức", không phải "tâm linh")
• "dạy crypto" → THAY BẰNG "giúp bạn hiểu năng lượng đồng tiền"
• "đảm bảo lợi nhuận" → XÓA HOÀN TOÀN (vi phạm pháp luật tài chính)
• "giàu nhanh" → XÓA HOÀN TOÀN (tạo kỳ vọng sai lệch)
• "ông" / "anh" khi nói về tu sĩ → THAY BẰNG "Thầy" / "Ngài"
• Không dùng emoji trong script
• Không hứa hẹn kết quả cụ thể về tài chính
• Không so sánh tiêu cực với các kênh/người khác`}function st(t){const{contentType:n,persona:e,writingMode:i,track:r,pillar:o,productHooks:c}=t,s=[];return s.push(`═══════════════════════════════════════════════════════════
DANH TÍNH — IDENTITY
═══════════════════════════════════════════════════════════

Bạn là Jennie Uyen Chu, nhà sáng tạo nội dung và founder của kênh YouTube "Thức Tỉnh Tâm Thức" với hơn 277,000 người đăng ký. Bạn kết hợp ĐỘC ĐÁO giữa kiến thức tài chính (crypto, trading, đầu tư) và tâm thức (thiền, năng lượng, tần số, nghiệp lực) để giúp người Việt vừa THỨC TỈNH vừa THỊNH VƯỢNG.

Kênh của bạn là nơi duy nhất mà một video có thể vừa phân tích Bitcoin vừa nói về nghiệp lực — và cả hai đều make sense.`),s.push(`═══════════════════════════════════════════════════════════
USP — ĐIỂM ĐỘC ĐÁO
═══════════════════════════════════════════════════════════

"Jennie không chỉ giải thích CHUYỆN GÌ xảy ra, mà còn giải mã TẦN SỐ và NGHIỆP LỰC đằng sau — để bạn không chỉ HIỂU, mà còn KHÔNG LẶP LẠI sai lầm đó."

Đây là kim chỉ nam cho MỌI nội dung. Mỗi bài viết phải:
1. Giải thích hiện tượng (WHAT happened)
2. Phân tích tần số/năng lượng đằng sau (WHY at frequency level)
3. Hướng dẫn không lặp lại (HOW to break the pattern)`),s.push(`═══════════════════════════════════════════════════════════
PERSONA — GIỌNG VĂN
═══════════════════════════════════════════════════════════

Persona hiện tại: ${e}
${Yt[e]}`),s.push(`═══════════════════════════════════════════════════════════
CHẾ ĐỘ VIẾT — WRITING MODE
═══════════════════════════════════════════════════════════

`+Tn[i]),s.push(`═══════════════════════════════════════════════════════════
TRACK & PILLAR
═══════════════════════════════════════════════════════════

Track: ${Wt[r]}

Pillar: ${yn[o]}`),s.push(`═══════════════════════════════════════════════════════════
QUY TẮC VÀNG — GOLDEN RULES
═══════════════════════════════════════════════════════════

`+vn()),s.push(`═══════════════════════════════════════════════════════════
THUẬT NGỮ CẤM — FORBIDDEN TERMS
═══════════════════════════════════════════════════════════

`+_n()),s.push(`═══════════════════════════════════════════════════════════
SẢN PHẨM & CÔNG CỤ GEM
═══════════════════════════════════════════════════════════

Các công cụ và khóa học GEM để weave vào nội dung (rải đều, KHÔNG dồn cuối):

`+bn()),c&&c.length>0&&s.push(`═══════════════════════════════════════════════════════════
PRODUCT HOOKS ƯU TIÊN
═══════════════════════════════════════════════════════════

Ưu tiên nhắc đến các sản phẩm sau trong bài viết này:
`+c.map(a=>`— ${a}`).join(`
`)),s.push(`═══════════════════════════════════════════════════════════
CẤU TRÚC NỘI DUNG
═══════════════════════════════════════════════════════════

`+Cn(n)),s.join(`

`)}const F={jennie_mentor:"Jennie Mentor — Người dẫn đường tâm linh, nhẹ nhàng nhưng sâu sắc",jennie_provocateur:"Jennie Provocateur — Thách thức tư duy, phá vỡ pattern cũ",jennie_storyteller:"Jennie Storyteller — Kể chuyện cuốn hút, kết nối cảm xúc",jennie_analyst:"Jennie Analyst — Phân tích dữ liệu, logic, evidence-based",jennie_motivator:"Jennie Motivator — Truyền năng lượng, thúc đẩy hành động",jennie_educator:"Jennie Educator — Dạy có hệ thống, giải thích rõ ràng",jennie_confidante:"Jennie Confidante — Tâm sự gần gũi, thấu hiểu nỗi đau"},wn={mode_1_calm:"MODE 1 — Bình tĩnh, uy tín, nuôi dưỡng. Giọng ấm áp, sâu lắng.",mode_2_provocative:"MODE 2 — Táo bạo, khiêu khích, pattern-interrupting. Giọng mạnh mẽ, thẳng thắn."},Nn={wealth:"Tài chính & Đầu tư",wellness:"Tâm linh & Sức khỏe tinh thần",integration:"Tích hợp Đời sống"},Mn={spiritual:"Tâm linh / Tần số / Tâm thức",trading:"Trading / Crypto / Đầu tư",latc_money:"Tiền bạc & Tư duy tài chính",lifestyle:"Lối sống & Phát triển bản thân"},xn=["GEM Scanner","GEM Whale Tracker","GEM Alert","GEM Portfolio","GEM Signal","GEM App","công cụ GEM","ứng dụng GEM"],An=["ví dụ crypto","ví dụ đời thường","trong crypto","trong cuộc sống","ngoài đời","trên chart","tương tự trong","giống như khi"];function ht(t,n,e,i){return`Bạn là ${F[t]}.

${wn[n]}

TRACK: ${Nn[e]}
PILLAR: ${Mn[i]}

QUY TẮC TUYỆT ĐỐI:
1. Viết 100% tiếng Việt có dấu đầy đủ. KHÔNG dùng tiếng Anh trừ thuật ngữ chuyên ngành (Bitcoin, crypto, blockchain).
2. Xưng hô: "Jennie" (ngôi thứ 1), "bạn" (ngôi thứ 2). KHÔNG dùng "mình", "tôi", "chúng ta".
3. Câu ngắn. Mỗi câu tối đa 15 từ. Xuống dòng sau mỗi ý.
4. KHÔNG mở đầu bằng "Xin chào", "Chào mừng", hay bất kỳ lời chào nào.
5. KHÔNG dùng emoji trong kịch bản.
6. Mỗi ý chính cần CẢ HAI ví dụ: (a) ví dụ crypto/trading VÀ (b) ví dụ đời thường.
7. Nhắc đến công cụ GEM tự nhiên, không ép buộc — chỉ khi phù hợp ngữ cảnh.
8. Dùng format Markdown: ## cho tiêu đề phần, ### cho tiêu đề phụ.
9. Mỗi phần phải có transition mượt sang phần tiếp theo.
10. Kết thúc mỗi phần bằng câu "hook" giữ người xem ở lại.`}function St(t,n,e,i){const r=i.length>0?`

SẢN PHẨM CẦN NHẮC ĐẾN (rải đều trong 5 phần chính):
${i.map((c,s)=>`${s+1}. ${c}`).join(`
`)}`:"",o=e==="mode_2_provocative"?`
ĐẶC BIỆT MODE 2: Mở đầu bằng câu gây sốc. Dùng phản đề. Thách thức niềm tin cũ. Giọng thẳng thắn, không ngại đụng chạm.`:`
ĐẶC BIỆT MODE 1: Mở đầu nhẹ nhàng nhưng sâu. Dẫn dắt bằng cảm xúc. Giọng ấm áp, nuôi dưỡng.`;return`CHỦ ĐỀ: "${t}"
PERSONA: ${F[n]}
${o}

VIẾT KỊCH BẢN LATC THEO CẤU TRÚC SAU (4000-5500 từ tổng cộng):

## HOOK (500 từ — 10% tổng kịch bản)

Viết 6 bước theo thứ tự:
[A] Pain point — Nêu nỗi đau cụ thể mà khán giả đang trải qua. Dùng ngôn ngữ của họ.
[B] Dual examples — Cho 2 ví dụ song song: 1 từ crypto/trading, 1 từ đời thường.
[C] Reality check — Câu hỏi tu từ khiến họ tự vấn. "Bạn có bao giờ tự hỏi..."
[D] Promise — Hứa hẹn cụ thể về những gì họ sẽ nhận được sau video này.
[E] Teaser — Nhắc 1 insight bất ngờ sẽ xuất hiện ở phần sau. "Và ở phần 4, Jennie sẽ tiết lộ..."
[F] Welcome — Câu chào đón vào video. KHÔNG dùng "Xin chào" — dùng style riêng.

## PHẦN 1: [Tiêu đề phần 1] (600-800 từ)

Viết 7 bước cho mỗi phần:
1. Bold statement — Mở đầu bằng nhận định mạnh, đi ngược số đông.
2. Jennie story — Kể 1 câu chuyện cá nhân của Jennie liên quan đến ý này.
3. DUAL EXAMPLES — Ví dụ crypto/trading + Ví dụ đời thường. Cả hai phải liên kết.
4. Tâm thức concept — Giải thích khái niệm tâm thức/tần số liên quan.
5. Bài tập + GEM Tool — Đề xuất bài tập thực hành. Nếu phù hợp, nhắc công cụ GEM.
6. Insight — Câu insight đáng ghi nhớ, đúc kết ý chính.
7. Transition — Câu chuyển mượt sang phần tiếp theo.

## PHẦN 2: [Tiêu đề phần 2] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 3: [Tiêu đề phần 3] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 4: [Tiêu đề phần 4] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 5: [Tiêu đề phần 5] (600-800 từ)
(Cùng 7 bước như trên)

## CTA KHÓA HỌC (200-300 từ — trước phần closing)

Viết 4 bước:
1. Summary — Tóm tắt 5 điều đã chia sẻ trong 1-2 câu mỗi điều.
2. "Hiểu hay sống?" — Đặt câu hỏi: kiến thức suông hay thay đổi thật?
3. Course transformation — Mô tả sự chuyển đổi cụ thể khi tham gia khóa học. KHÔNG nói giá. KHÔNG nói tên khóa học trực tiếp.
4. "Không dành cho tất cả" — Khẳng định khóa học chỉ phù hợp với người sẵn sàng thay đổi.

## CLOSING (200 từ)

Viết 5 bước:
1. Touching — Câu chạm cảm xúc sâu, gợi reflection.
2. App summary — Nhắc ứng dụng GEM như công cụ đồng hành hàng ngày.
3. Comment — Mời comment bằng câu hỏi cụ thể liên quan đến chủ đề.
4. Like/Sub — Nhắc nhẹ like/subscribe bằng lý do (để không bỏ lỡ phần tiếp).
5. Teaser — Preview nội dung video tiếp theo.${r}

YÊU CẦU QUAN TRỌNG:
- Tổng kịch bản: 4000-5500 từ tiếng Việt.
- Mỗi phần (1-5) phải có ÍT NHẤT 1 cặp dual examples (crypto + đời thường).
- Product hooks phải được rải đều, tự nhiên — KHÔNG tập trung hết ở 1 phần.
- Dùng Markdown: ## cho phần chính, ### cho phần phụ.
- Câu ngắn. Tối đa 15 từ/câu. Xuống dòng sau mỗi ý.`}function _t(t,n,e){const i=e==="mode_2_provocative"?`
MODE 2: Giọng mạnh mẽ hơn. Phơi bày thẳng thắn. Dùng phản đề sắc bén.`:`
MODE 1: Giọng kính trọng, sâu lắng. Phân tích bằng lòng từ bi.`;return`CHỦ ĐỀ: "${t}"
PERSONA: ${F[n]}
${i}

VIẾT KỊCH BẢN TMT (Thầy Minh Tuệ Commentary) THEO CẤU TRÚC SAU (4500-5500 từ tổng cộng):

QUY TẮC TMT ĐẶC BIỆT:
- Gọi Sư Minh Tuệ bằng "Thầy" hoặc "Ngài". TUYỆT ĐỐI KHÔNG dùng "ông", "anh".
- Khi phê bình ai: KHÔNG nêu tên cụ thể → dùng cách gọi "Đề Bà Đạt Đa 5.0" (ẩn dụ cho người chống phá).
- Mọi nhận định phải evidence-based — có dẫn chứng hoặc logic rõ ràng.
- Framing nhân quả: mọi sự việc đều có nhân-duyên-quả.
- Giọng văn kính trọng với Thầy, thẳng thắn với hiện tượng xã hội.

## PHẦN 1: INTRO (300-400 từ)

3 bước:
1. Hook mạnh — Mở đầu bằng sự kiện/hiện tượng gây chú ý liên quan đến Thầy Minh Tuệ hoặc tu hành.
2. Drama — Nêu mâu thuẫn/xung đột trung tâm của chủ đề. Tại sao vấn đề này quan trọng?
3. Promise — Hứa hẹn: video này sẽ phân tích điều gì? Người xem sẽ hiểu được gì?

## PHẦN 2: TỔNG QUAN (400-500 từ)

3 bước:
1. "Tội danh" — Liệt kê các hành vi/hiện tượng đáng phân tích. Dùng ngôn ngữ mạnh nhưng công bằng.
2. Pattern — Chỉ ra pattern lặp lại. "Đây không phải lần đầu..."
3. Tương phản — So sánh: hành vi của Thầy vs. hành vi của "Đề Bà Đạt Đa 5.0".

## PHẦN 3: [Tiêu đề — điểm phân tích 1, nhẹ nhất] (500-700 từ)

Phân tích từ nhẹ đến nặng. Evidence-based.
- Nêu sự kiện/bằng chứng cụ thể.
- Phân tích dưới góc nhìn Phật pháp.
- Kết nối với đời thường.

## PHẦN 4: [Tiêu đề — điểm phân tích 2] (500-700 từ)

Nặng hơn phần 3. Đào sâu hơn.
- Evidence-based claims.
- Nhân quả framing: "Gieo nhân gì, gặt quả nấy."
- Câu chuyện hoặc ví dụ minh họa.

## PHẦN 5: [Tiêu đề — điểm phân tích 3] (500-700 từ)

Nặng hơn phần 4.
- Phơi bày động cơ ẩn giấu.
- Đối chiếu với kinh điển (nếu phù hợp).

## PHẦN 6: [Tiêu đề — điểm phân tích 4] (500-700 từ)

Gần climax. Tension cao.
- Tích lũy bằng chứng.
- Build-up cảm xúc.

## PHẦN 7: CLIMAX (700-900 từ)

Phần quan trọng nhất. Đánh dấu bằng ★.
3 bước:
1. Triết học — Nâng vấn đề lên tầm triết học Phật giáo. Vô thường, nhân quả, nghiệp.
2. Revelation — Tiết lộ insight bất ngờ. "Và đây là điều ít ai nhận ra..."
3. "Cảm ơn nghịch duyên" — Reframe: ngay cả người chống phá cũng là duyên giúp Thầy và chúng ta trưởng thành.

## PHẦN 8: CLOSING (500-600 từ)

3 bước:
1. Tổng kết — Đúc kết 4-5 điểm chính đã phân tích.
2. Hạnh tu — Liên hệ với hành trình tu tập cá nhân. "Mỗi chúng ta đều có thể..."
3. Touching — Câu chạm cảm xúc sâu về lòng kính trọng với Thầy.

## PHẦN 9: CTA 4 LỚP (200-250 từ)

4 bước CTA chồng lên nhau:
1. Engagement — "Bạn nghĩ sao? Comment chia sẻ góc nhìn..."
2. Document — "Video này là tài liệu lưu giữ. Hãy save lại..."
3. Subscribe — "Bấm subscribe + chuông để không bỏ lỡ phần tiếp theo..."
4. Fanpage — "Tham gia cộng đồng trên fanpage để thảo luận sâu hơn..."

YÊU CẦU QUAN TRỌNG:
- Tổng kịch bản: 4500-5500 từ tiếng Việt.
- Đảm bảo escalation: nhẹ → nặng từ phần 3 đến phần 7.
- Phần 7 (Climax) là phần dài nhất và sâu nhất.
- Giọng văn phải nhất quán: kính trọng Thầy, thẳng thắn với hiện tượng.
- Dùng Markdown: ## cho phần chính.
- Câu ngắn. Tối đa 15 từ/câu.`}function wt(t,n,e){return e==="mode_2_provocative"?`CHỦ ĐỀ: "${t}"
PERSONA: ${F[n]}

VIẾT KỊCH BẢN SHORT CLIP MODE 2 (PROVOCATIVE) — 75-200 từ, 30-70 giây:

CẤU TRÚC 7 BƯỚC:

### Bước 1: Cognitive Dissonance (3 giây)
Mở đầu bằng câu đi ngược 100% niềm tin phổ biến.
"Bạn nghĩ [X] là đúng? Sai hoàn toàn."

### Bước 2: Voice frustration (5 giây)
Nói lên sự thất vọng mà khán giả đang cảm nhận nhưng chưa dám nói.
"Jennie cũng từng tin điều đó. Và Jennie đã trả giá..."

### Bước 3: Brutal honesty (7 giây)
Sự thật trần trụi. Không đường mật.
Dùng con số hoặc ví dụ cụ thể.

### Bước 4: Reframe (10 giây)
Lật ngược góc nhìn.
"Nhưng nếu bạn nhìn từ góc này..."

### Bước 5: Metaphor (7 giây)
Ẩn dụ mạnh kết nối ý chính với trải nghiệm quen thuộc.

### Bước 6: Solution (7 giây)
Show Don't Tell. Giải pháp cụ thể, hành động được ngay.
Nếu phù hợp, nhắc công cụ GEM.

### Bước 7: Identity shift (5 giây)
Kết bằng câu thay đổi danh tính.
"Bạn không phải người [X]. Bạn là người [Y]."
CTA khéo léo — KHÔNG nói giá.

YÊU CẦU:
- Tổng: 75-200 từ (30-70 giây khi đọc).
- Câu cực ngắn. 5-10 từ/câu.
- Mỗi câu 1 dòng.
- KHÔNG emoji.
- Dùng Markdown: ### cho mỗi bước.`:`CHỦ ĐỀ: "${t}"
PERSONA: ${F[n]}

VIẾT KỊCH BẢN SHORT CLIP MODE 1 (CALM) — 75-200 từ, 30-70 giây:

CẤU TRÚC 5 BƯỚC:

### Bước 1: ĐAU (Pain) — 3 giây giữ người xem
Mở đầu bằng nỗi đau cụ thể, quen thuộc.
"Bạn có bao giờ [pain point]?"
Dùng ngôn ngữ của khán giả, không học thuật.

### Bước 2: TRẢI NGHIỆM (Story) — 10 giây
Kể câu chuyện cá nhân ngắn gọn của Jennie.
"Jennie từng [trải nghiệm]..."
Tạo kết nối cảm xúc.

### Bước 3: INSIGHT (Revelation) — 10 giây
"Và rồi Jennie nhận ra..."
Tiết lộ insight bất ngờ.
Kết nối pain point với sự thật sâu hơn.

### Bước 4: GIẢI PHÁP (Solution) — 10 giây
Show Don't Tell.
Cho hành động cụ thể, làm được ngay.
Nếu phù hợp, nhắc công cụ GEM tự nhiên.

### Bước 5: CTA KHÉO LÉO — 5 giây
KHÔNG nói giá.
KHÔNG nói tên khóa học.
Kết bằng câu hỏi hoặc câu khiến người xem suy nghĩ.
"Bạn sẽ chọn [A] hay [B]?"

YÊU CẦU:
- Tổng: 75-200 từ (30-70 giây khi đọc).
- Câu cực ngắn. 5-10 từ/câu.
- Mỗi câu 1 dòng.
- KHÔNG emoji.
- Dùng Markdown: ### cho mỗi bước.`}function Q(t,n){const e=[],i=/^## (.+)$/gm,r=[];let o;for(;(o=i.exec(t))!==null;){const c=o[1];c!==void 0&&r.push({title:c.trim(),index:o.index})}if(r.length===0)return[{title:"Nội dung",content:t.trim(),wordCount:_.countWords(t),order:0,hasGemTool:Nt(t),hasDualExample:Mt(t)}];for(let c=0;c<r.length;c++){const s=r[c];if(!s)continue;const a=r[c+1],h=s.index,p=a?a.index:t.length,f=t.slice(h,p).trim(),y=f.indexOf(`
`),u=y>=0?f.slice(y+1).trim():"";e.push({title:s.title,content:u,wordCount:_.countWords(u),order:c,hasGemTool:Nt(u),hasDualExample:Mt(u)})}return e}function Nt(t){const n=t.toLowerCase();return xn.some(e=>n.includes(e.toLowerCase()))}function Mt(t){const n=t.toLowerCase();let e=0;for(const i of An)n.includes(i.toLowerCase())&&e++;return e>=2}function ut(t){switch(t){case"latc":return 16384;case"tmt":return 16384;case"short_clip":return 2048;case"social_post":return 4096;case"news":return 16384}}function lt(t){return t==="mode_2_provocative"?.85:.7}const di={async generateLATC(t){const n=ht(t.persona,t.writingMode,t.track,t.pillar),e=St(t.topic,t.persona,t.writingMode,t.productHooks??[]),i=await k.generate({systemPrompt:n,userPrompt:e,maxTokens:ut("latc"),temperature:lt(t.writingMode),onStream:t.onStream}),r=Q(i.content),o=_.countWords(i.content),c=_.estimateDuration(i.content);return{content:i.content,wordCount:o,estimatedDuration:c,sections:r}},async generateTMT(t){const n=ht(t.persona,t.writingMode,t.track,t.pillar),e=_t(t.topic,t.persona,t.writingMode),i=await k.generate({systemPrompt:n,userPrompt:e,maxTokens:ut("tmt"),temperature:lt(t.writingMode),onStream:t.onStream}),r=Q(i.content),o=_.countWords(i.content),c=_.estimateDuration(i.content);return{content:i.content,wordCount:o,estimatedDuration:c,sections:r}},async generateShortClip(t){const n=ht(t.persona,t.writingMode,t.track,t.pillar),e=wt(t.topic,t.persona,t.writingMode),i=await k.generate({systemPrompt:n,userPrompt:e,maxTokens:ut("short_clip"),temperature:lt(t.writingMode),onStream:t.onStream}),r=Q(i.content),o=_.countWords(i.content),c=_.estimateDuration(i.content);return{content:i.content,wordCount:o,estimatedDuration:c,sections:r}},parseScript:Q,buildLATCPrompt:St,buildTMTPrompt:_t,buildClipPrompt:wt},Pn=65,En=50,bt={wealth:"Tài chính, đầu tư, crypto, trading",wellness:"Tâm linh, thiền, tần số, chữa lành",integration:"Tích hợp đời sống, phát triển bản thân"},Ln=["GEM","GEM App","GEM Scanner","GEM Whale","khóa học","course","chương trình","đăng ký","mua ngay","giá","miễn phí","free"],In=["the","and","for","you","this","that","with","from","your","how","why","what","when","where","who"];function Rn(t,n,e){return`Tạo tiêu đề video YouTube cho chủ đề: "${t}"
Lĩnh vực: ${bt[n]}
${e?`Tóm tắt nội dung: ${e}`:""}

Tạo 3 tiêu đề, mỗi tiêu đề theo 1 trong 4 công thức dưới đây (chọn 3 công thức phù hợp nhất):

CÔNG THỨC A — Tương phản nhỏ→lớn:
"Từ [điều nhỏ bé] → [điều lớn lao đầy ý nghĩa]"
Ví dụ: "Từ 1 Đồng Xu → Tần Số Thay Đổi Cả Cuộc Đời"

CÔNG THỨC B — Số + Bí mật:
"[Số] Sự Thật/Thói Quen/Bí Mật Về [chủ đề]..."
Ví dụ: "5 Thói Quen Buổi Sáng Nâng Tần Số Ngay Lập Tức"

CÔNG THỨC C — Tại sao + Pain + Tần số:
"Tại Sao [nỗi đau]? — Đây Là Tần Số..."
Ví dụ: "Tại Sao Bạn Cứ Mất Tiền? — Đây Là Tần Số Đang Phá Hoại Bạn"

CÔNG THỨC D — Keyword bí ẩn:
"Một [từ/điều/thói quen] thôi cũng thay đổi tần số..."
Ví dụ: "Một Từ Thôi Cũng Thay Đổi Tần Số Tiền Bạc Của Bạn"

QUY TẮC:
- Dưới 65 ký tự.
- KHÔNG có tên sản phẩm, khóa học, hay app.
- Tiếng Việt có dấu đầy đủ.
- CTR mục tiêu: 8-14%.
- Viết hoa chữ cái đầu mỗi từ quan trọng.
- Dùng dấu "..." hoặc "—" để tạo tò mò.

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "A",
    "formulaName": "Tương phản nhỏ→lớn",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-12%"
  },
  {
    "formula": "B",
    "formulaName": "Số + Bí mật",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "9-11%"
  },
  {
    "formula": "C",
    "formulaName": "Tại sao + Pain",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "8-10%"
  }
]`}function On(t,n,e){return`Tạo tiêu đề video YouTube TMT (Thầy Minh Tuệ Commentary) cho chủ đề: "${t}"
Lĩnh vực: ${bt[n]}
${e?`Tóm tắt nội dung: ${e}`:""}

Tạo 3 tiêu đề, mỗi tiêu đề theo 1 trong 5 công thức dưới đây (chọn 3 công thức phù hợp nhất):

CÔNG THỨC A — Keyword + Drama:
"[SƯ MINH TUỆ]: [Drama hook]"
Ví dụ: "SƯ MINH TUỆ: Sự Thật Đằng Sau Cuộc Hành Trình..."

CÔNG THỨC B — Số + Bí mật:
"SƯ MINH TUỆ — [Số] Bí Mật Về [Chủ đề]..."
Ví dụ: "SƯ MINH TUỆ — 5 Bí Mật Về Cuộc Sống Khất Thực"

CÔNG THỨC C — Câu hỏi:
"SƯ MINH TUỆ: Tại Sao [Câu hỏi]?"
Ví dụ: "SƯ MINH TUỆ: Tại Sao Ngài Từ Chối Mọi Cúng Dường?"

CÔNG THỨC D — Hành trình:
"SƯ MINH TUỆ — Hành Trình [Mô tả hành trình]..."
Ví dụ: "SƯ MINH TUỆ — Hành Trình 6 Năm Không Một Đồng"

CÔNG THỨC E — Cảnh báo + Nhân quả:
"SƯ MINH TUỆ: CẢNH BÁO — [Cảnh báo liên quan nhân quả]"
Ví dụ: "SƯ MINH TUỆ: CẢNH BÁO — Nhân Quả Với Người Phỉ Báng Tu Hành"

QUY TẮC ĐẶC BIỆT TMT:
- "SƯ MINH TUỆ" PHẢI xuất hiện ĐẦU TIÊN trong tiêu đề.
- Dưới 65 ký tự.
- KHÔNG có tên sản phẩm, khóa học, hay app.
- Tiếng Việt có dấu đầy đủ.
- Giọng kính trọng — KHÔNG giật gân rẻ tiền.

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "A",
    "formulaName": "Keyword + Drama",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-12%"
  },
  {
    "formula": "C",
    "formulaName": "Câu hỏi",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "9-11%"
  },
  {
    "formula": "E",
    "formulaName": "Cảnh báo + Nhân quả",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "8-10%"
  }
]`}function Hn(t,n,e){return`Tạo tiêu đề Short Clip (TikTok/Reels/Shorts) cho chủ đề: "${t}"
Lĩnh vực: ${bt[n]}
${e?`Tóm tắt nội dung: ${e}`:""}

Tạo 3 tiêu đề ngắn, punchy, tối ưu cho mobile:

QUY TẮC:
- Dưới 50 ký tự (hiển thị tốt trên mobile).
- Gây tò mò ngay lập tức.
- Tiếng Việt có dấu đầy đủ.
- Dùng 1 trong các pattern:
  + Câu hỏi ngắn: "Tại sao...?"
  + Thách thức: "Bạn dám [X] không?"
  + Bí mật: "[Số] điều về [X]..."
  + Phản đề: "[X] không như bạn nghĩ"
  + Cảm xúc: "Khi [tình huống đau]..."

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "question",
    "formulaName": "Câu hỏi ngắn",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "12-15%"
  },
  {
    "formula": "challenge",
    "formulaName": "Thách thức",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "11-14%"
  },
  {
    "formula": "emotion",
    "formulaName": "Cảm xúc",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-13%"
  }
]`}function gt(t){const n=t.match(/\[[\s\S]*\]/);if(!n)throw new Error("Không tìm thấy JSON hợp lệ trong phản hồi tạo tiêu đề.");const e=JSON.parse(n[0]);if(!Array.isArray(e))throw new Error("Phản hồi tạo tiêu đề không phải mảng JSON.");const i=[];for(const r of e)if(typeof r=="object"&&r!==null&&"formula"in r&&"formulaName"in r&&"title"in r&&"estimatedCtr"in r){const o=r,c=o.formula,s=o.formulaName,a=o.title,h=o.estimatedCtr;typeof c=="string"&&typeof s=="string"&&typeof a=="string"&&typeof h=="string"&&i.push({formula:c,formulaName:s,title:a,estimatedCtr:h})}if(i.length===0)throw new Error("Không có tiêu đề hợp lệ trong phản hồi.");return i}function $n(t,n){const e=[],i=n==="short_clip"?En:Pn;t.length>i&&e.push(`Tiêu đề vượt quá ${i} ký tự (hiện tại: ${t.length} ký tự).`);const r=t.toLowerCase();for(const a of Ln)r.includes(a.toLowerCase())&&e.push(`Tiêu đề chứa từ cấm "${a}". Không được nhắc tên sản phẩm/khóa học trong tiêu đề.`);/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(t)||e.push("Tiêu đề không có dấu tiếng Việt. Cần viết đầy đủ dấu.");const c=t.toLowerCase().split(/\s+/),s=[];for(const a of c){const h=a.replace(/[^a-z]/g,"");h.length>0&&In.includes(h)&&s.push(h)}if(s.length>0&&e.push(`Tiêu đề chứa từ tiếng Anh không cần thiết: ${s.join(", ")}. Nên dùng tiếng Việt.`),n==="tmt"){const a=t.trim();a.startsWith("SƯ MINH TUỆ")||a.startsWith("Sư Minh Tuệ")||e.push('Tiêu đề TMT phải bắt đầu bằng "SƯ MINH TUỆ". Đây là quy tắc bắt buộc cho nội dung TMT.')}return{valid:e.length===0,warnings:e}}const dt=`Bạn là chuyên gia tạo tiêu đề video YouTube tiếng Việt cho kênh Jennie.
Bạn hiểu sâu về:
- Thuật toán YouTube và CTR optimization.
- Tâm lý người xem Việt Nam.
- Cách viết tiêu đề gây tò mò mà không clickbait rẻ tiền.

QUY TẮC:
- Trả lời ĐÚNG format JSON được yêu cầu.
- KHÔNG thêm giải thích hay text ngoài JSON.
- Tiếng Việt có dấu đầy đủ.
- KHÔNG dùng emoji trong tiêu đề.`,mi={async generateLATCTitles(t){const n=Rn(t.topic,t.track,t.scriptSummary??""),e=await k.generate({systemPrompt:dt,userPrompt:n,maxTokens:1024,temperature:.8,onStream:t.onStream});return{titles:gt(e.content).map(o=>({formula:o.formula,formulaName:o.formulaName,title:o.title,charCount:o.title.length,estimatedCtr:o.estimatedCtr})),topic:t.topic,contentType:"latc"}},async generateTMTTitles(t){const n=On(t.topic,t.track,t.scriptSummary??""),e=await k.generate({systemPrompt:dt,userPrompt:n,maxTokens:1024,temperature:.8,onStream:t.onStream});return{titles:gt(e.content).map(o=>({formula:o.formula,formulaName:o.formulaName,title:o.title,charCount:o.title.length,estimatedCtr:o.estimatedCtr})),topic:t.topic,contentType:"tmt"}},async generateClipTitles(t){const n=Hn(t.topic,t.track,t.scriptSummary??""),e=await k.generate({systemPrompt:dt,userPrompt:n,maxTokens:1024,temperature:.85,onStream:t.onStream});return{titles:gt(e.content).map(o=>({formula:o.formula,formulaName:o.formulaName,title:o.title,charCount:o.title.length,estimatedCtr:o.estimatedCtr})),topic:t.topic,contentType:"short_clip"}},validateTitle:$n},Dn={latc:"LATC (Long-form Authority Thought-leader Content)",tmt:"TMT (Thầy Minh Tuệ Commentary)",short_clip:"Short Clip"},Gn={wealth:"Tài chính & Đầu tư",wellness:"Tâm linh & Sức khỏe tinh thần",integration:"Tích hợp Đời sống"},Bn={jennie_mentor:"Jennie Mentor",jennie_provocateur:"Jennie Provocateur",jennie_storyteller:"Jennie Storyteller",jennie_analyst:"Jennie Analyst",jennie_motivator:"Jennie Motivator",jennie_educator:"Jennie Educator",jennie_confidante:"Jennie Confidante"},mt=">>>",Kn=[/\*\*(.+?)\*\*/g,/__(.*?)__/g];function qn(t){const n=new Date(t);if(isNaN(n.getTime()))return t;const e=String(n.getDate()).padStart(2,"0"),i=String(n.getMonth()+1).padStart(2,"0"),r=n.getFullYear(),o=String(n.getHours()).padStart(2,"0"),c=String(n.getMinutes()).padStart(2,"0");return`${e}/${i}/${r} ${o}:${c}`}function Un(t){return t.normalize("NFC").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").replace(/[^a-zA-Z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").toLowerCase().slice(0,80)}function Vn(t){const n=new Date(t);if(isNaN(n.getTime())){const o=new Date;return`${o.getFullYear()}-${String(o.getMonth()+1).padStart(2,"0")}-${String(o.getDate()).padStart(2,"0")}`}const e=n.getFullYear(),i=String(n.getMonth()+1).padStart(2,"0"),r=String(n.getDate()).padStart(2,"0");return`${e}-${i}-${r}`}const x={toMarkdown(t,n){const e=Dn[n.contentType]??n.contentType,i=Gn[n.track]??n.track,r=Bn[n.persona]??n.persona,o=qn(n.createdAt),c=_.estimateDuration(t),s=_.formatDuration(c),a=`---
Tiêu đề: ${n.title}
Loại nội dung: ${e}
Track: ${i}
Persona: ${r}
Số từ: ${n.wordCount}
Thời lượng ước tính: ${s}
Ngày tạo: ${o}
---

# ${n.title}

`,h=`

---

*Kịch bản được tạo bởi GEM Content Control Center*
*${e} | ${i} | ${r}*
*${n.wordCount} từ | ${s}*
*Ngày tạo: ${o}*
`;return a+t+h},toPlainText(t){let n=_.stripMarkdown(t);return n=n.split(`
`).map(e=>e.trim()).join(`
`),n=n.replace(/\n{3,}/g,`

`),n.trim()},toTeleprompter(t){let n=t;for(const i of Kn)n=n.replace(i,(r,o)=>o.toUpperCase());let e=_.toTeleprompterText(n);return e=e.replace(/^\s*(\d+\.\s*|\[\w\]\s*)/gm,""),e=e.replace(/\n\n+/g,`

${mt}

`),e=e.replace(new RegExp(`(${mt}\\s*){2,}`,"g"),`${mt}

`),e.trim()},async copyToClipboard(t){if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(t),!0}catch{}if(typeof document<"u")try{const n=document.createElement("textarea");n.value=t,n.style.position="fixed",n.style.left="-9999px",n.style.top="-9999px",n.style.opacity="0",document.body.appendChild(n),n.focus(),n.select();const e=document.execCommand("copy");return document.body.removeChild(n),e}catch{return!1}return!1},generateFilename(t,n){const e=Un(t),i=Vn(new Date().toISOString());let r;switch(n){case"md":case"markdown":r="md";break;case"teleprompter":case"teleprompter.txt":r="teleprompter.txt";break;case"txt":case"text":default:r="txt";break}return`${e||"kich-ban"}_${i}.${r}`},downloadAsFile(t,n,e){if(typeof document>"u"||typeof URL>"u")return;const i="\uFEFF",r=new Blob([i+t],{type:`${e};charset=utf-8`}),o=URL.createObjectURL(r),c=document.createElement("a");c.href=o,c.download=n,c.style.display="none",document.body.appendChild(c),c.click(),setTimeout(()=>{document.body.removeChild(c),URL.revokeObjectURL(o)},100)},downloadAsMarkdown(t,n){const e=x.toMarkdown(t,n),i=x.generateFilename(n.title,"md");x.downloadAsFile(e,i,"text/markdown")},downloadAsText(t,n){const e=x.toPlainText(t),i=x.generateFilename(n,"txt");x.downloadAsFile(e,i,"text/plain")},downloadAsTeleprompter(t,n){const e=x.toTeleprompter(t),i=x.generateFilename(n,"teleprompter.txt");x.downloadAsFile(e,i,"text/plain")}};function jn(t,n,e){return`Bạn là chuyên gia content marketing cho kênh "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube dưới đây, tạo 5 bài Facebook Posts với 5 góc tiếp cận khác nhau.

## Kịch Bản Gốc
Tiêu đề: ${t}
Track: ${e}
---
${n.slice(0,3e3)}
---

## Yêu cầu:
- Mỗi bài từ 150-300 từ
- Tiếng Việt thuần túy, không dùng từ tiếng Anh
- 5 góc tiếp cận: (1) Câu hỏi gây tò mò, (2) Chia sẻ insight, (3) Câu chuyện cá nhân, (4) Data/số liệu, (5) Truyền cảm hứng
- Mỗi bài có 3-5 hashtags phù hợp
- Không dùng bullet points, viết văn xuôi
- CTA nhẹ nhàng: "Xem full video trên kênh YouTube" hoặc tương tự
- Không nhắc giá sản phẩm

Trả về JSON array:
[{"angle":"...", "content":"...", "hashtags":["..."]}]`}function Jn(t,n,e){return`Bạn là chuyên gia email marketing cho "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube, tạo 3 email sequence: nurture → value → CTA.

## Kịch Bản Gốc
Tiêu đề: ${t}
Track: ${e}
---
${n.slice(0,3e3)}
---

## 3 Email:
1. **Nurture** (Ngày 1): Chia sẻ 1 insight từ video, tạo connection, không bán hàng
2. **Value** (Ngày 3): Deep dive vào 1 concept, cung cấp giá trị thực, gợi mở
3. **CTA** (Ngày 7): Kết nối pain point → solution, CTA khóa học/app

## Yêu cầu:
- Subject line hấp dẫn (< 60 ký tự)
- Preheader text (< 90 ký tự)
- Tiếng Việt thuần túy
- Văn phong thân mật, gần gũi
- Mỗi email 200-400 từ

Trả về JSON array:
[{"type":"nurture|value|cta", "subject":"...", "preheader":"...", "body":"...", "timing":"Ngày X", "ctaText":"...", "ctaUrl":"..."}]`}function Fn(t,n){return`Bạn là chuyên gia short-form content cho "Jennie Uyen Chu".

Từ kịch bản YouTube dài, trích xuất 4 đoạn ngắn phù hợp TikTok/Reels/Shorts (30-60 giây mỗi clip).

## Kịch Bản Gốc
Tiêu đề: ${t}
---
${n.slice(0,4e3)}
---

## Yêu cầu mỗi clip:
- Hook mạnh (câu đầu gây chú ý)
- Nội dung 80-150 từ (30-60 giây)
- CTA ngắn: "Follow để xem thêm" / "Link ở bio"
- Gợi ý vị trí trong kịch bản gốc (timestamp hint)
- Chọn 4 khoảnh khắc hay nhất: insight sâu, moment gây bất ngờ, data thú vị, câu quote đáng nhớ

Trả về JSON array:
[{"title":"...", "hook":"...", "body":"...", "cta":"...", "wordCount":120, "estimatedDuration":45, "timestampHint":"Phần 3 - khoảng phút 12"}]`}function Yn(t,n,e){return`Bạn là copywriter cho landing page "Jennie Uyen Chu".

Từ kịch bản YouTube, tạo copy cho 1 landing page quảng bá khóa học/sản phẩm liên quan.

## Kịch Bản Gốc
Tiêu đề: ${t}
Track: ${e}
---
${n.slice(0,3e3)}
---

## Cấu trúc landing page:
- Headline: 1 câu mạnh, gây tò mò (< 15 từ)
- Subheadline: Giải thích benefit chính (< 25 từ)
- 3-4 Pain Points mà đối tượng gặp phải
- 4-5 Benefits của giải pháp
- Gợi ý testimonial prompt
- CTA button text + subtext
- Urgency line (khan hiếm, thời gian)

## Yêu cầu:
- Tiếng Việt thuần túy
- Không nói giá cụ thể
- Tập trung transformation, không feature
- Kết nối tần số & nghiệp lực (USP Jennie)

Trả về JSON:
{"headline":"...", "subheadline":"...", "painPoints":["..."], "benefits":["..."], "testimonialPrompt":"...", "ctaText":"...", "ctaSubtext":"...", "urgencyLine":"..."}`}function Wn(t,n){return`Bạn là community manager cho "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube, tạo 2 câu hỏi cho community (Facebook Group, YouTube Community tab).

## Kịch Bản Gốc
Tiêu đề: ${t}
---
${n.slice(0,2e3)}
---

## Yêu cầu:
- Câu hỏi mở, khuyến khích chia sẻ trải nghiệm
- Gợi ý 2-3 câu trả lời mẫu (để kích hoạt thảo luận)
- Có engagement hook (poll, emoji vote, tag bạn bè)
- Kết nối với nội dung video

Trả về JSON array:
[{"question":"...", "context":"...", "engagementHook":"...", "expectedResponses":["..."]}]`}function U(t,n){try{const e=t.match(/\[[\s\S]*\]|\{[\s\S]*\}/);return e?JSON.parse(e[0]):n}catch{return n}}const pi={async repurpose(t){var p,f,y,u;const{scriptId:n,scriptTitle:e,scriptBody:i,track:r,targets:o,onProgress:c}=t,s={scriptId:n,scriptTitle:e,totalItems:0,completedTargets:[],failedTargets:[],createdAt:new Date().toISOString()},a=st({contentType:"latc",track:r,persona:"jennie_educator",writingMode:"mode_1_calm",pillar:"lifestyle"});for(const d of o){c==null||c(d,"generating");try{switch(d){case"facebook_posts":{const l=jn(e,i,r),m=await k.generate({systemPrompt:a,userPrompt:l,maxTokens:4096,temperature:.8}),T=U(m.content,[]);s.facebookPosts=T.map(M=>{var vt;return{...M,charCount:((vt=M.content)==null?void 0:vt.length)??0,platform:"facebook"}}),s.totalItems+=s.facebookPosts.length;break}case"email_sequence":{const l=Jn(e,i,r),m=await k.generate({systemPrompt:a,userPrompt:l,maxTokens:4096,temperature:.7});s.emails=U(m.content,[]),s.totalItems+=s.emails.length;break}case"short_clips":{const l=Fn(e,i),m=await k.generate({systemPrompt:a,userPrompt:l,maxTokens:3072,temperature:.7});s.clips=U(m.content,[]),s.totalItems+=s.clips.length;break}case"landing_page":{const l=Yn(e,i,r),m=await k.generate({systemPrompt:a,userPrompt:l,maxTokens:2048,temperature:.7});s.landingPage=U(m.content,{headline:"",subheadline:"",painPoints:[],benefits:[],testimonialPrompt:"",ctaText:"",ctaSubtext:"",urgencyLine:""}),s.totalItems+=1;break}case"community_questions":{const l=Wn(e,i),m=await k.generate({systemPrompt:a,userPrompt:l,maxTokens:2048,temperature:.8});s.questions=U(m.content,[]),s.totalItems+=s.questions.length;break}}s.completedTargets.push(d),c==null||c(d,"done")}catch{s.failedTargets.push(d),c==null||c(d,"error")}}const h=[...((p=s.facebookPosts)==null?void 0:p.map(d=>d.content))??[],...((f=s.emails)==null?void 0:f.map(d=>d.body))??[],...((y=s.clips)==null?void 0:y.map(d=>`${d.hook} ${d.body}`))??[],s.landingPage?`${s.landingPage.headline} ${s.landingPage.subheadline}`:"",...((u=s.questions)==null?void 0:u.map(d=>d.question))??[]].filter(Boolean).join(`

`);if(h){const d=Zt.check(h,"latc");s.brandVoiceScore=d.score}return s},getTargetLabel(t){return{facebook_posts:"5 Facebook Posts",email_sequence:"3 Email Sequences",short_clips:"4 Short Clips",landing_page:"1 Landing Page",community_questions:"2 Community Questions"}[t]},getTargetDescription(t){return{facebook_posts:"5 góc tiếp cận khác nhau từ kịch bản gốc",email_sequence:"Chuỗi email: nurture → value → CTA (Ngày 1, 3, 7)",short_clips:"4 khoảnh khắc hay nhất, 30-60 giây mỗi clip",landing_page:"Copy landing page với headline, benefits, CTA",community_questions:"2 câu hỏi cho Facebook Group/YouTube Community"}[t]},getAllTargets(){return["facebook_posts","email_sequence","short_clips","landing_page","community_questions"]}},X=[{name:"Wealth Funnel",track:"wealth",color:"#d4a853",description:"Từ Drama Content → Scanner → Khóa học Trading",conversionNote:"TIER 2 có 78% lựa chọn — sweet spot pricing",steps:[{step:1,product:"Drama Content",cta:"Organic reach",conversionRate:100},{step:2,product:"Scanner Free Trial",price:"Miễn phí",cta:"Soft invite",conversionRate:35},{step:3,product:"GEM Trading Starter",price:"299K",cta:"Problem-Solution",conversionRate:18},{step:4,product:"TIER 1",price:"11M",cta:"Transformation",conversionRate:8},{step:5,product:"TIER 2",price:"21M",cta:"Social proof + Urgency",conversionRate:6.2},{step:6,product:"TIER 3",price:"68M",cta:"Legacy + Vision",conversionRate:1.5}]},{name:"Wellness Funnel",track:"wellness",color:"#9b6dff",description:"Từ Tâm Thức Content → App → Khóa Healing",steps:[{step:1,product:"Tâm Thức Content",cta:"Organic reach",conversionRate:100},{step:2,product:"App Free",price:"Miễn phí",cta:"Value",conversionRate:42},{step:3,product:"Tần Số Tình Yêu",price:"399K",cta:"Story",conversionRate:22},{step:4,product:"7 Ngày Khai Mở",price:"1.99M",cta:"Transformation",conversionRate:9},{step:5,product:"Crystals Shopify",price:"Varies",cta:"Lifestyle",conversionRate:5}]},{name:"Integration Funnel",track:"integration",color:"#10B981",description:"Từ Bridge Content → App → Khóa Tư Duy — Best Conversion",conversionNote:"Integration track có tỷ lệ chuyển đổi cao nhất",steps:[{step:1,product:"Bridge Content",cta:"Organic reach",conversionRate:100},{step:2,product:"App Free",price:"Miễn phí",cta:"Question",conversionRate:45},{step:3,product:"Tư Duy Triệu Phú",price:"499K / 1.99M",cta:"Before/After",conversionRate:25},{step:4,product:"TIER 2",price:"21M",cta:"Legacy + Vision",conversionRate:7},{step:5,product:"Crystals + Community",price:"Varies",cta:"Belonging",conversionRate:4}]}],pt=[{id:1,name:"Soft Invite",example:"Nếu bạn muốn tìm hiểu sâu hơn...",track:"all"},{id:2,name:"Problem-Solution",example:"Nếu bạn đang mắc kẹt trong...thì đây là giải pháp",track:"all"},{id:3,name:"Transformation",example:"Từ [trước] → [sau] chỉ trong 7 ngày",track:"all"},{id:4,name:"Social Proof",example:"2.847 học viên đã thay đổi...",track:"wealth"},{id:5,name:"Urgency",example:"Chỉ còn 48 giờ để đăng ký...",track:"wealth"},{id:6,name:"Question Hook",example:"Bạn có muốn biết bí mật mà...?",track:"all"},{id:7,name:"Story Bridge",example:"Câu chuyện của Hương bắt đầu giống bạn...",track:"wellness"},{id:8,name:"Data Point",example:"93% người áp dụng thấy kết quả trong 30 ngày",track:"wealth"},{id:9,name:"Before/After",example:"Trước khi học: lo lắng. Sau: tự tin với mỗi quyết định",track:"integration"},{id:10,name:"Legacy",example:"Đây không chỉ là đầu tư cho bạn, mà cho con cháu bạn",track:"integration"},{id:11,name:"Fear of Missing",example:"Mỗi ngày không hành động là một ngày bạn mất...",track:"wealth"},{id:12,name:"Vision Paint",example:"Hãy tưởng tượng 6 tháng sau...",track:"all"},{id:13,name:"Community",example:"Tham gia cộng đồng 10.000+ người cùng tần số",track:"wellness"},{id:14,name:"Expert Authority",example:"Với 8 năm kinh nghiệm và 277K subscribers...",track:"all"},{id:15,name:"Risk Reversal",example:"Nếu không hài lòng, hoàn tiền 100% trong 7 ngày",track:"wealth"},{id:16,name:"Curiosity Gap",example:"Có 1 điều mà 95% trader không biết...",track:"wealth"},{id:17,name:"Value Stack",example:"Bạn nhận được: Scanner + Cộng đồng + Mentor...",track:"wealth"},{id:18,name:"Emotional",example:"Bạn xứng đáng được sống với tần số cao nhất",track:"wellness"},{id:19,name:"Challenge",example:"Thử 7 ngày, nếu không thay đổi, tôi chịu trách nhiệm",track:"integration"},{id:20,name:"Exclusive",example:"Chỉ dành cho những ai thực sự sẵn sàng thay đổi",track:"all"},{id:21,name:"Frequency Bridge",example:"Khi tần số bạn thay đổi, mọi thứ xung quanh cũng thay đổi",track:"wellness"},{id:22,name:"Karma Connect",example:"Nghiệp lực không phải là số phận — bạn có thể chuyển hóa",track:"wellness"},{id:23,name:"Tool Demo",example:"Scanner vừa phát hiện 3 tín hiệu mà...",track:"wealth"},{id:24,name:"Milestone",example:"Bước đầu tiên luôn là bước khó nhất. Hãy bắt đầu hôm nay",track:"all"},{id:25,name:"Comparison",example:"Giá 1 ly cà phê mỗi ngày = trọn bộ kiến thức...",track:"wealth"},{id:26,name:"Deadline",example:"Ưu đãi kết thúc vào [ngày]. Sau đó giá sẽ...",track:"wealth"},{id:27,name:"Bio Link",example:"Link ở bio — bấm ngay khi còn slot",track:"all"},{id:28,name:"Comment Trigger",example:'Comment "SẴN SÀNG" để nhận link đăng ký',track:"all"},{id:29,name:"DM Invite",example:'Nhắn tin "KHOÁ HỌC" để được tư vấn riêng',track:"all"},{id:30,name:"Gentle Close",example:"Dù bạn chọn gì, hãy nhớ: bạn xứng đáng nhiều hơn thế",track:"wellness"}],fi={validateScript(t,n){const e=[],i=t.toLowerCase().indexOf("lời nhắn"),r=t.toLowerCase().indexOf("khóa học");i>0&&r>i?e.push({rule:"CTA khóa học phải đặt TRƯỚC phần closing",severity:"critical",passed:!1,suggestion:'Di chuyển phần CTA lên trước "Lời nhắn touching"'}):e.push({rule:"CTA khóa học TRƯỚC closing",severity:"critical",passed:!0}),/tải.*tài liệu|download.*pdf|link.*document/i.test(t)?e.push({rule:"KHÔNG được CTA tải tài liệu tóm tắt",severity:"critical",passed:!1,suggestion:"Thay bằng CTA app download hoặc khóa học"}):e.push({rule:"Không CTA tài liệu",severity:"critical",passed:!0}),n==="short_clip"&&/\d+K|\d+M|giá|chi phí|phí/i.test(t)?e.push({rule:"CTA Khéo Léo: KHÔNG nói giá trong video ngắn",severity:"high",passed:!1,suggestion:'Chỉ gợi mở benefit: "Link ở bio" hoặc "Comment để nhận"'}):e.push({rule:"Không nói giá trong video ngắn",severity:"high",passed:!0});const o=t.match(/khóa học|scanner|app|tier|tần số tình yêu|khai mở|tư duy triệu phú|crystals/gi)??[],c=new Set(o.map(a=>a.toLowerCase()));c.size>3?e.push({rule:"Tối đa 3 sản phẩm mỗi kịch bản",severity:"medium",passed:!1,suggestion:`Đang nhắc ${c.size} sản phẩm, giảm xuống 3`}):e.push({rule:"Tối đa 3 sản phẩm mỗi kịch bản",severity:"medium",passed:!0});const s=t.split(`
`)[0]??"";return/scanner|tier|khóa học|app gem/i.test(s)?e.push({rule:"Sản phẩm KHÔNG trong tiêu đề",severity:"critical",passed:!1,suggestion:"Ưu tiên giáo dục, share value trước khi mention sản phẩm"}):e.push({rule:"Sản phẩm không trong tiêu đề",severity:"critical",passed:!0}),/link|đăng ký|tham gia|comment|nhắn tin|bio/i.test(t)?e.push({rule:"Kịch bản có CTA",severity:"high",passed:!0}):e.push({rule:"Kịch bản phải có ít nhất 1 CTA",severity:"high",passed:!1,suggestion:'Thêm CTA: "Link ở bio", "Comment để nhận", hoặc "Đăng ký ngay"'}),e},getRecommendedCTA(t){const n=X.find(i=>i.track===t)??X[2],e=pt.filter(i=>i.track==="all"||i.track===t).slice(0,5).map(i=>i.name);return{track:n.track,steps:n.steps,patterns:e}},getFunnelByTrack(t){return X.find(n=>n.track===t)},getPatternsByTrack(t){return pt.filter(n=>n.track==="all"||n.track===t)},getAllFunnels(){return X},getAllPatterns(){return pt}},xt="gem_offline_queue",yi={offlineQueue:[],async queueAction(t){const n={...t,id:crypto.randomUUID(),queued_at:Date.now()};typeof navigator<"u"&&navigator.onLine?await this.executeAction(n):(this.offlineQueue.push(n),await this.persistQueue())},async executeAction(t){const n=g(),e=this.getTableName(t.entity_type),i=r=>n.from(r);switch(t.action){case"create":{const{error:r}=await i(e).insert(t.payload);if(r)throw r;break}case"update":{const{error:r}=await i(e).update({...t.payload,updated_at:new Date().toISOString()}).eq("id",t.entity_id);if(r)throw r;break}case"delete":{const{error:r}=await i(e).delete().eq("id",t.entity_id);if(r)throw r;break}}},async syncOnReconnect(){const t=await this.loadQueue(),n={success:0,failed:0,conflicts:[],timestamp:new Date().toISOString()};for(const e of t)try{if(e.action==="update"){const i=await this.fetchCurrent(e.entity_type,e.entity_id);if(i&&new Date(i.updated_at).getTime()>e.queued_at){n.conflicts.push({action:e,serverVersion:i,resolution:"Phiên bản máy chủ mới hơn. Giữ phiên bản nào?"});continue}}await this.executeAction(e),n.success++}catch{n.failed++}return this.offlineQueue=[],await this.persistQueue(),n},async fetchCurrent(t,n){const e=this.getTableName(t),{data:i}=await g().from(e).select("*").eq("id",n).single();return i},subscribeToChanges(t,n){const e=this.getTableName(t),i=g().channel(`sync-${e}`).on("postgres_changes",{event:"*",schema:"public",table:e},r=>{n(r)}).subscribe();return{unsubscribe:()=>{i.unsubscribe()}}},setupConnectionListeners(t){if(typeof window>"u")return()=>{};const n=async()=>{if(this.offlineQueue.length>0){const e=await this.syncOnReconnect();t(e)}};return window.addEventListener("online",n),()=>{window.removeEventListener("online",n)}},getQueueLength(){return this.offlineQueue.length},isOnline(){return typeof navigator>"u"?!0:navigator.onLine},getTableName(t){return{script:"cc_scripts",calendar_event:"cc_calendar_events",social_post:"cc_social_posts",title:"cc_titles",image_prompt:"cc_image_prompts"}[t]},async persistQueue(){typeof localStorage<"u"&&localStorage.setItem(xt,JSON.stringify(this.offlineQueue))},async loadQueue(){if(typeof localStorage<"u"){const t=localStorage.getItem(xt);t&&(this.offlineQueue=JSON.parse(t))}return this.offlineQueue}},At={dashboard:[{target:".stat-cards",title:"Bảng Điều Khiển",body:"4 chỉ số quan trọng nhất: kịch bản tạo, đang chờ, tỷ lệ hoàn thành, và thời gian trung bình.",position:"bottom"},{target:".content-pillars",title:"4 Trụ Cột → 3 Track",body:"Phân bổ nội dung: Wealth 30%, Wellness 30%, Integration 40%. Đảm bảo cân bằng giữa các track.",position:"right"},{target:".quick-actions",title:"Hành Động Nhanh",body:"Tạo nội dung mới chỉ với 1 click. Chọn loại nội dung và bắt đầu ngay.",position:"top"}],"ai-gen":[{target:".content-type-select",title:"Loại Nội Dung",body:"Chọn LATC (dài), TMT (drama), Short Clip, Social Post, hoặc Image Prompt.",position:"bottom"},{target:".persona-select",title:"7 Persona",body:"Mỗi persona có ngôn ngữ và pain point riêng. Gen Z Trader cần số liệu, Spiritual Seeker cần tần số.",position:"right"},{target:".writing-mode",title:"Phong Cách Viết",body:"MODE 1: Trầm Tĩnh Thủ Thỉ — Sang, Thấm, Sâu. MODE 2: Đanh Thép Provocative — Brutal Honesty.",position:"bottom"},{target:".generate-btn",title:"Tạo Nội Dung",body:"AI sẽ tự đọc framework, brand voice rules, và tạo kịch bản đầy đủ tuân thủ 10 Quy Tắc Vàng.",position:"left"}],latc:[{target:".structure-section",title:"Cấu Trúc LATC",body:"Hook + 5 Phần Chính + CTA + Closing = 4.000-5.500 từ, 20-35 phút.",position:"right"},{target:".golden-rules",title:"10 Quy Tắc Vàng",body:"Mỗi kịch bản PHẢI tuân thủ 10 quy tắc: dual examples, prose flowing, GEM tools rải đều...",position:"left"},{target:".gem-tools-map",title:"GEM Tools Mapping",body:"Rải công cụ đều trong 5 phần, KHÔNG dồn cuối. Scanner, Whale Tracker, Backtesting...",position:"bottom"}],tmt:[{target:".tmt-structure",title:"Cấu Trúc TMT",body:"9 phần: Intro → Tổng Quan → 4 Phần Chính → Climax → Closing → CTA 4 Lớp.",position:"right"},{target:".emotional-arc",title:"Cung Cảm Xúc",body:"Từ nhẹ → nặng. Phần 1 tò mò, Phần 4 sốc, Climax cực điểm, Closing touching.",position:"bottom"}],"short-clips":[{target:".clip-timeline",title:"Timeline 5 Bước",body:"Hook (3s) → Context (5s) → Core (15-40s) → CTA (5s) → End Card (2s).",position:"bottom"},{target:".platform-preview",title:"Preview Nền Tảng",body:"Xem trước clip trên TikTok, Instagram Reels, YouTube Shorts với kích thước thực.",position:"left"}],"social-posts":[{target:".campaign-grid",title:"Lịch 30 Ngày",body:"Lên lịch bài đăng cho 30 ngày. Tự động phân bổ theo track và persona.",position:"bottom"},{target:".cta-patterns",title:"CTA Patterns",body:"30 mẫu CTA xoay vòng. Mỗi tuần dùng pattern khác nhau để tránh lặp.",position:"right"}],thumbs:[{target:".title-formulas",title:"Công Thức Tiêu Đề",body:"4 công thức LATC + 5 công thức TMT. Mỗi tiêu đề tối đa 65 ký tự.",position:"bottom"},{target:".ab-variants",title:"A/B/C Variants",body:"Tạo 3 biến thể để test. So sánh CTR dự kiến và chọn tiêu đề tốt nhất.",position:"right"}],"image-gen":[{target:".category-tabs",title:"8 Danh Mục",body:"Thumbnail, Social Banner, Story, Quote Card, và nhiều loại khác.",position:"bottom"},{target:".color-system",title:"Design System GEM",body:"Sử dụng bảng màu thương hiệu: Gold, Purple, Cyan, Emerald. Đảm bảo nhất quán.",position:"left"}],calendar:[{target:".calendar-grid",title:"Lịch Nội Dung",body:"Kéo thả sự kiện. Mon=Wealth, Wed=Wellness, Fri=Integration, Sun=Deep content.",position:"bottom"},{target:".track-distribution",title:"Phân Bổ Track",body:"Theo dõi tỷ lệ Wealth 30% / Wellness 30% / Integration 40% mỗi tuần.",position:"right"}],analytics:[{target:".connect-yt",title:"Kết Nối YouTube",body:"Liên kết kênh YouTube để xem phân tích chi tiết về views, CTR, retention.",position:"bottom"},{target:".ai-analysis",title:"AI Phân Tích",body:"Claude phân tích dữ liệu hàng tuần: top performers, content gaps, action plan.",position:"left"}],repurpose:[{target:".script-select",title:"Chọn Kịch Bản",body:"Chọn 1 kịch bản YouTube → tạo content cho 5 nền tảng khác nhau.",position:"bottom"},{target:".target-select",title:"Chọn Đích",body:"5 Facebook Posts, 3 Email, 4 Short Clips, 1 Landing Page, 2 Community Questions.",position:"right"}],funnels:[{target:".funnel-tabs",title:"3 Phễu Chuyển Đổi",body:"Wealth (Trading), Wellness (Tâm Thức), Integration (Kết Hợp). Mỗi phễu có 4-6 bước.",position:"bottom"},{target:".cta-rules",title:"Quy Tắc CTA",body:"CTA trước closing, không nói giá trong video, tối đa 3 sản phẩm mỗi kịch bản.",position:"left"}],brand:[{target:".golden-rules",title:"10 Quy Tắc Vàng",body:"Mọi nội dung PHẢI tuân thủ. Brand voice checker tự động kiểm tra.",position:"bottom"}],settings:[{target:".api-config",title:"Cấu Hình API",body:"Nhập Anthropic API Key, chọn model mặc định, điều chỉnh temperature.",position:"bottom"}]},Ti={getSteps(t){return At[t]??[]},async isCompleted(t,n){const{data:e}=await g().from("profiles").select("onboarding_completed").eq("id",t).single(),i=e==null?void 0:e.onboarding_completed;return(i==null?void 0:i[n])??!1},async markCompleted(t,n){const{data:e}=await g().from("profiles").select("onboarding_completed").eq("id",t).single(),i=(e==null?void 0:e.onboarding_completed)??{};await g().from("profiles").update({onboarding_completed:{...i,[n]:!0}}).eq("id",t)},async resetScreen(t,n){const{data:e}=await g().from("profiles").select("onboarding_completed").eq("id",t).single(),i=(e==null?void 0:e.onboarding_completed)??{};delete i[n],await g().from("profiles").update({onboarding_completed:i}).eq("id",t)},async resetAll(t){await g().from("profiles").update({onboarding_completed:{}}).eq("id",t)},getAllScreenIds(){return Object.keys(At)}},Z="claude-haiku-4-5-20251001",A="claude-sonnet-4-5-20250929",H={topic_analysis:{config:{model:Z,maxTokens:500,temperature:.3,label:"Haiku — Phân tích chủ đề"},costLabel:"~$0.001",tier:"fast"},brand_check:{config:{model:Z,maxTokens:1e3,temperature:.2,label:"Haiku — Kiểm tra brand voice"},costLabel:"~$0.002",tier:"fast"},title_generation:{config:{model:Z,maxTokens:800,temperature:.8,label:"Haiku — Tạo tiêu đề"},costLabel:"~$0.001",tier:"fast"},term_conversion:{config:{model:Z,maxTokens:500,temperature:.1,label:"Haiku — Chuyển đổi thuật ngữ"},costLabel:"~$0.001",tier:"fast"},outline:{config:{model:A,maxTokens:2e3,temperature:.6,label:"Sonnet — Tạo outline"},costLabel:"~$0.01",tier:"medium"},social_post:{config:{model:A,maxTokens:1500,temperature:.7,label:"Sonnet — Bài mạng xã hội"},costLabel:"~$0.008",tier:"medium"},short_clip:{config:{model:A,maxTokens:1500,temperature:.75,label:"Sonnet — Script clip ngắn"},costLabel:"~$0.008",tier:"medium"},email_generation:{config:{model:A,maxTokens:2e3,temperature:.65,label:"Sonnet — Tạo email"},costLabel:"~$0.01",tier:"medium"},image_prompt:{config:{model:A,maxTokens:1e3,temperature:.7,label:"Sonnet — Prompt hình ảnh"},costLabel:"~$0.005",tier:"medium"},full_script:{config:{model:A,maxTokens:8e3,temperature:.7,label:"Sonnet — Full script (LATC/TMT)"},costLabel:"~$0.05",tier:"full"},analytics_insight:{config:{model:A,maxTokens:4096,temperature:.5,label:"Sonnet — Phân tích analytics"},costLabel:"~$0.03",tier:"full"},repurpose:{config:{model:A,maxTokens:6e3,temperature:.65,label:"Sonnet — Tái sử dụng nội dung"},costLabel:"~$0.04",tier:"full"}},Pt={config:{model:A,maxTokens:4096,temperature:.7,label:"Sonnet — Mặc định"},costLabel:"~$0.02"};function zn(t,n){const e=Math.max(0,Math.min(1,n));if(e===0)return t;const i=1+e*.5,r=Math.round(t.maxTokens*i),o=e*.05,c=Math.max(.1,t.temperature-o);return{...t,maxTokens:r,temperature:Number(c.toFixed(2))}}const K={selectModel(t,n){const i={...(H[t]??Pt).config};return n!==void 0&&n>0?zn(i,n):i},getAvailableModels(){const t=new Set,n=[];for(const e of Object.values(H)){const i=`${e.config.model}:${e.config.maxTokens}`;t.has(i)||(t.add(i),n.push({...e.config}))}return n},getCostEstimate(t){const n=H[t]??Pt;return{model:n.config.model,estimatedCost:n.costLabel}},getTaskTypes(){return Object.keys(H)},getTaskTier(t){const n=H[t];return(n==null?void 0:n.tier)??"medium"},getTasksByTier(t){return Object.entries(H).filter(([,n])=>n.tier===t).map(([n])=>n)}},Qn=85,Xn=5,Zn=3;function z(t){if(t!=null&&t.aborted)throw new Error("Đã hủy pipeline tạo nội dung.")}function kt(t,n){try{return JSON.parse(t)}catch{const e=t.match(/\{[\s\S]*\}/);if(e)try{return JSON.parse(e[0])}catch{return n}return n}}function te(t){const n=t.toLowerCase().trim();return n.includes("spiritual")||n.includes("tâm thức")||n.includes("tâm linh")?"spiritual":n.includes("trading")||n.includes("giao dịch")?"trading":n.includes("latc")||n.includes("money")||n.includes("tiền")?"latc_money":"lifestyle"}function ne(t){const n=t.toLowerCase().trim();return n.includes("wealth")||n.includes("tài chính")?"wealth":n.includes("wellness")||n.includes("tâm thức")?"wellness":"integration"}function ee(t){const n=t.toLowerCase().trim();return n.includes("mentor")?"jennie_mentor":n.includes("provocateur")?"jennie_provocateur":n.includes("storyteller")?"jennie_storyteller":n.includes("analyst")?"jennie_analyst":n.includes("motivator")?"jennie_motivator":n.includes("educator")?"jennie_educator":n.includes("confidante")?"jennie_confidante":"jennie_mentor"}async function zt(t){z(t.signal);const n=K.selectModel("topic_analysis"),e=await k.generate({systemPrompt:'Bạn là chuyên gia phân tích nội dung cho kênh "Thức Tỉnh Tâm Thức" của Jennie Uyen Chu. Kênh kết hợp tài chính (crypto, trading) và tâm thức (thiền, năng lượng, tần số). Phân tích chủ đề và trả về JSON.',userPrompt:`Phân tích chủ đề sau cho kênh Jennie Uyen Chu:

CHỦ ĐỀ: "${t.topic}"
TRACK YÊU CẦU: ${t.track}
PERSONA YÊU CẦU: ${t.persona}
WRITING MODE: ${t.writingMode}

Trả về JSON (KHÔNG thêm text ngoài JSON):
{
  "pillar": "spiritual|trading|latc_money|lifestyle",
  "track": "wealth|wellness|integration",
  "suggestedPersona": "jennie_mentor|jennie_provocateur|...",
  "emotionalArc": "Mô tả cung cảm xúc: mở đầu → cao trào → kết",
  "keyTopics": ["keyword1", "keyword2", "keyword3"],
  "uniqueAngle": "Góc tiếp cận độc đáo cho chủ đề này"
}`,maxTokens:n.maxTokens,temperature:n.temperature,model:n.model,signal:t.signal}),i={pillar:"lifestyle",track:t.track,suggestedPersona:t.persona,emotionalArc:"Tò mò → Suy ngẫm → Giác ngộ → Hành động",keyTopics:[t.topic],uniqueAngle:"Kết nối tài chính và tâm thức qua lăng kính tần số"},r=kt(e.content,{});return{pillar:r.pillar?te(r.pillar):i.pillar,track:r.track?ne(r.track):i.track,suggestedPersona:r.suggestedPersona?ee(r.suggestedPersona):i.suggestedPersona,emotionalArc:r.emotionalArc??i.emotionalArc,keyTopics:Array.isArray(r.keyTopics)&&r.keyTopics.length>0?r.keyTopics:i.keyTopics,uniqueAngle:r.uniqueAngle??i.uniqueAngle}}async function Qt(t,n,e){z(t.signal);const i=K.selectModel("outline"),r=t.productHooks&&t.productHooks.length>0?`
SẢN PHẨM GEM CẦN NHẮC: ${t.productHooks.join(", ")}`:"",o=e==="latc"?"CẤU TRÚC LATC: Hook (500 từ) → 5 Phần chính (600-800 từ mỗi phần) → CTA (200-300 từ) → Closing (200 từ). Tổng: 4000-5500 từ.":"CẤU TRÚC TMT: Intro (300-400 từ) → Tổng quan (400-500 từ) → 4 Phần phân tích escalating (500-700 từ) → Climax (700-900 từ) → Closing (500-600 từ) → CTA 4 lớp (200-250 từ). Tổng: 4500-5500 từ.",c=await k.generate({systemPrompt:'Bạn là chuyên gia lập dàn bài cho kênh "Thức Tỉnh Tâm Thức". Mỗi phần phải có dual examples (crypto + đời sống). GEM tools phải được rải đều, KHÔNG dồn cuối bài. Trả về JSON dàn bài chi tiết.',userPrompt:`Tạo outline chi tiết cho nội dung ${e.toUpperCase()}:

CHỦ ĐỀ: "${t.topic}"
PILLAR: ${n.pillar}
TRACK: ${n.track}
PERSONA: ${t.persona}
WRITING MODE: ${t.writingMode}
EMOTIONAL ARC: ${n.emotionalArc}
KEY TOPICS: ${n.keyTopics.join(", ")}
GÓC TIẾP CẬN: ${n.uniqueAngle}
${r}

${o}

Trả về JSON (KHÔNG thêm text ngoài JSON):
{
  "title": "Tiêu đề đề xuất (không chứa tên sản phẩm)",
  "sections": [
    {
      "heading": "Tên phần",
      "summary": "Tóm tắt nội dung 2-3 câu",
      "targetWordCount": 600,
      "cryptoExample": "Ví dụ crypto/tài chính cụ thể",
      "lifeExample": "Ví dụ đời sống/đời thường tương ứng"
    }
  ],
  "estimatedWordCount": 4500,
  "gemToolPlacements": ["Phần 1: GEM Scanner khi nói về...", "Phần 3: GEM Vision Board khi..."]
}`,maxTokens:i.maxTokens,temperature:i.temperature,model:i.model,signal:t.signal}),s={title:t.topic,sections:[{heading:"Hook",summary:"Mở đầu gây tò mò về chủ đề",targetWordCount:500,cryptoExample:"Ví dụ từ thị trường crypto",lifeExample:"Ví dụ từ đời sống hàng ngày"}],estimatedWordCount:e==="latc"?4500:5e3,gemToolPlacements:[]},a=kt(c.content,{});return{title:a.title??s.title,sections:Array.isArray(a.sections)&&a.sections.length>0?a.sections:s.sections,estimatedWordCount:a.estimatedWordCount??s.estimatedWordCount,gemToolPlacements:Array.isArray(a.gemToolPlacements)?a.gemToolPlacements:s.gemToolPlacements}}async function ie(t,n,e,i){z(t.signal);const r=K.selectModel("full_script"),o=st({contentType:i,persona:t.persona,writingMode:t.writingMode,track:n.track,pillar:n.pillar,productHooks:t.productHooks}),c=e.sections.map((h,p)=>`## ${h.heading} (~${h.targetWordCount} từ)
Nội dung: ${h.summary}
Ví dụ crypto: ${h.cryptoExample}
Ví dụ đời sống: ${h.lifeExample}`).join(`

`),s=e.gemToolPlacements.length>0?`
VỊ TRÍ GEM TOOLS:
${e.gemToolPlacements.join(`
`)}`:"";return(await k.generate({systemPrompt:o,userPrompt:`Viết kịch bản ${i.toUpperCase()} hoàn chỉnh dựa trên outline sau:

TIÊU ĐỀ: ${e.title}
EMOTIONAL ARC: ${n.emotionalArc}
GÓC TIẾP CẬN: ${n.uniqueAngle}
${s}

OUTLINE CHI TIẾT:
${c}

YÊU CẦU:
- Viết đầy đủ từng phần theo outline, KHÔNG tóm tắt.
- Mỗi phần chính phải có dual examples (crypto + đời sống).
- Dùng Markdown: ## cho phần chính.
- Câu ngắn, tối đa 15 từ/câu.
- 100% tiếng Việt có dấu. KHÔNG emoji.
- Tổng: ${e.estimatedWordCount} từ.`,maxTokens:r.maxTokens,temperature:r.temperature,model:r.model,onStream:t.onStream,signal:t.signal})).content}async function oe(t,n,e){z(t.signal);const i=K.selectModel("brand_check"),r=await k.generate({systemPrompt:'Bạn là bot kiểm tra brand voice cho kênh "Thức Tỉnh Tâm Thức". Kiểm tra 10 Quy Tắc Vàng và chấm điểm 0-100. Trả về JSON.',userPrompt:`Kiểm tra nội dung ${e.toUpperCase()} sau theo 10 QUY TẮC VÀNG:

① DUAL EXAMPLES: Mỗi phần có cả ví dụ crypto VÀ đời sống?
② DẪN VÀO BỐI CẢNH: Có câu dẫn nhập trước ví dụ?
③ GEM TOOLS RẢI ĐỀU: GEM tools có rải đều hay dồn cuối?
④ TIẾNG VIỆT THUẦN TÚY: Có thuật ngữ tiếng Anh cần chuyển đổi?
⑤ PROSE FLOWING: Có dùng bullet points không?
⑥ TẦN SỐ LÀ TRUNG TÂM: Có nhắc tần số/nghiệp lực?
⑦ CTA TRƯỚC CLOSING: CTA đặt đúng vị trí?
⑧ GIÁO DỤC > BÁN HÀNG: Sản phẩm có xuất hiện trong tiêu đề?
⑨ TRANSITION PHRASES: Có câu chuyển tiếp giữa các phần?
⑩ CLOSING TOUCHING: Phần kết có nhẹ nhàng, ấm áp?

NỘI DUNG CẦN KIỂM TRA:
${n.substring(0,6e3)}

Trả về JSON (KHÔNG thêm text ngoài JSON):
{
  "score": 87,
  "violations": [
    {
      "ruleNumber": 4,
      "ruleName": "TIẾNG VIỆT THUẦN TÚY",
      "description": "Tìm thấy 'mindset' chưa chuyển đổi",
      "fix": "Thay 'mindset' bằng 'tư duy'"
    }
  ],
  "passed": true
}`,maxTokens:i.maxTokens,temperature:i.temperature,model:i.model,signal:t.signal}),o={score:80},c=kt(r.content,{}),s=typeof c.score=="number"?Math.max(0,Math.min(100,c.score)):o.score;return{score:s,violations:Array.isArray(c.violations)?c.violations:[],passed:s>=Qn}}async function re(t,n,e,i){z(t.signal);const r=K.selectModel("full_script"),o=e.violations.map(a=>`- Quy tắc ${a.ruleNumber} (${a.ruleName}): ${a.description}
  → Sửa: ${a.fix}`).join(`
`),c=st({contentType:i,persona:t.persona,writingMode:t.writingMode,track:t.track,pillar:"lifestyle",productHooks:t.productHooks});return(await k.generate({systemPrompt:c,userPrompt:`Kịch bản ${i.toUpperCase()} sau đạt ${e.score}/100 điểm brand voice.
Cần sửa các vi phạm sau:

${o}

KỊCH BẢN CẦN SỬA:
${n}

YÊU CẦU:
- Sửa TẤT CẢ vi phạm được liệt kê ở trên.
- Giữ nguyên cấu trúc, tone, và nội dung tổng thể.
- KHÔNG thêm lời giải thích — chỉ trả về kịch bản đã sửa.
- Đảm bảo 100% tiếng Việt, câu ngắn, prose flowing, dual examples.
- Output: kịch bản hoàn chỉnh đã sửa lỗi.`,maxTokens:r.maxTokens,temperature:r.temperature,model:r.model,signal:t.signal})).content}async function Et(t,n){var u,d,l,m,T,M;const e=Xn,i=[];let r=0;const o=Date.now();let c=Date.now();const s=await zt(t);i.push(Date.now()-c),r+=500,(u=t.onStepComplete)==null||u.call(t,1,e,"Phân tích chủ đề"),c=Date.now();const a=await Qt(t,s,n);i.push(Date.now()-c),r+=2e3,(d=t.onStepComplete)==null||d.call(t,2,e,"Tạo dàn bài"),c=Date.now();const h=await ie(t,s,a,n);i.push(Date.now()-c),r+=8e3,(l=t.onStepComplete)==null||l.call(t,3,e,"Viết kịch bản"),c=Date.now();const p=await oe(t,h,n);i.push(Date.now()-c),r+=1e3,(m=t.onStepComplete)==null||m.call(t,4,e,"Kiểm tra brand voice");let f=h,y=!1;return p.passed?(i.push(0),(M=t.onStepComplete)==null||M.call(t,5,e,"Bỏ qua (score đạt chuẩn)")):(c=Date.now(),f=await re(t,h,p,n),i.push(Date.now()-c),r+=8e3,y=!0,(T=t.onStepComplete)==null||T.call(t,5,e,"Polish & sửa lỗi")),{content:f,topicAnalysis:s,outline:a,brandCheck:p,wasPolished:y,pipelineStats:{totalDurationMs:Date.now()-o,stepDurations:i,totalTokensEstimated:r,stepsCompleted:y?5:4}}}async function ce(t){var u,d,l;const n=Zn,e=[];let i=0;const r=Date.now();let o=Date.now();const c=await zt(t);e.push(Date.now()-o),i+=500,(u=t.onStepComplete)==null||u.call(t,1,n,"Phân tích chủ đề"),o=Date.now();const s=await Qt(t,c,"short_clip");e.push(Date.now()-o),i+=1e3,(d=t.onStepComplete)==null||d.call(t,2,n,"Tạo dàn bài clip"),o=Date.now();const a=K.selectModel("short_clip"),h=st({contentType:"short_clip",persona:t.persona,writingMode:t.writingMode,track:c.track,pillar:c.pillar,productHooks:t.productHooks}),p=s.sections.map(m=>`- ${m.heading}: ${m.summary}`).join(`
`),f=await k.generate({systemPrompt:h,userPrompt:`Viết kịch bản SHORT CLIP (75-200 từ, 30-70 giây) dựa trên:

CHỦ ĐỀ: "${t.topic}"
GÓC TIẾP CẬN: ${c.uniqueAngle}
OUTLINE:
${p}

WRITING MODE: ${t.writingMode==="mode_1_calm"?"Calm — 5 bước":"Provocative — 7 bước"}

YÊU CẦU:
- 75-200 từ tổng cộng.
- Câu cực ngắn: 5-10 từ/câu.
- Mỗi câu 1 dòng.
- KHÔNG emoji.
- Dùng Markdown ### cho mỗi bước.`,maxTokens:a.maxTokens,temperature:a.temperature,model:a.model,onStream:t.onStream,signal:t.signal});e.push(Date.now()-o),i+=1500,(l=t.onStepComplete)==null||l.call(t,3,n,"Viết kịch bản clip");const y={score:100,violations:[],passed:!0};return{content:f.content,topicAnalysis:c,outline:s,brandCheck:y,wasPolished:!1,pipelineStats:{totalDurationMs:Date.now()-r,stepDurations:e,totalTokensEstimated:i,stepsCompleted:3}}}const bi={async generateLATCScript(t){return Et(t,"latc")},async generateTMTScript(t){return Et(t,"tmt")},async generateClipScript(t){return ce(t)}};function C(t){return{data:null,error:t,success:!1}}function L(t){return{data:t,error:null,success:!0}}const Lt={script:"Tạo kịch bản",title:"Tạo tiêu đề",social_post:"Tạo bài đăng mạng xã hội",image_prompt:"Tạo prompt hình ảnh",short_clip:"Tạo kịch bản clip ngắn",repurpose:"Tái sử dụng nội dung",analytics:"Phân tích dữ liệu",video_process:"Xử lý video"},ki={async addJob(t){try{const n=g(),i={job_type:{script:"script",title:"title",social_post:"social_post",image_prompt:"image_prompt",short_clip:"script",repurpose:"script",analytics:"analysis",video_process:"script"}[t.type],status:"queued",priority:t.priority??"medium",input_params:{...t.params,_job_subtype:t.type},created_by:t.userId,content_type:t.contentType??null,track:t.track??null,pillar:t.pillar??null,persona:t.persona??null,writing_mode:t.writingMode??null,entity_type:t.entityType??null,entity_id:t.entityId??null,max_retries:t.maxRetries??3,retry_count:0,metadata:{label:Lt[t.type]}},{data:r,error:o}=await n.from("cc_generation_jobs").insert(i).select().single();return o?C(o.message):L(r)}catch(n){const e=n instanceof Error?n.message:"Lỗi thêm công việc vào hàng đợi.";return C(e)}},async getActiveJobs(t){try{const n=g(),{data:e,error:i}=await n.from("cc_generation_jobs").select("*").eq("created_by",t).in("status",["queued","processing"]).order("created_at",{ascending:!0});return i?C(i.message):L(e??[])}catch(n){const e=n instanceof Error?n.message:"Lỗi tải danh sách công việc đang hoạt động.";return C(e)}},async cancelJob(t){try{const n=g(),{data:e,error:i}=await n.from("cc_generation_jobs").select("status").eq("id",t).single();if(i)return C(i.message);const r=e==null?void 0:e.status;if(r!=="queued"&&r!=="processing")return C(`Không thể huỷ công việc có trạng thái "${r}". Chỉ huỷ được công việc đang chờ hoặc đang xử lý.`);const o={status:"cancelled",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{data:c,error:s}=await n.from("cc_generation_jobs").update(o).eq("id",t).select().single();return s?C(s.message):L(c)}catch(n){const e=n instanceof Error?n.message:"Lỗi huỷ công việc.";return C(e)}},async updateProgress(t,n,e){try{const i=g(),o={metadata:{progress:Math.max(0,Math.min(100,n))},updated_at:new Date().toISOString(),...e?{status:e}:{}};e==="processing"&&(o.started_at=new Date().toISOString()),(e==="completed"||e==="failed")&&(o.completed_at=new Date().toISOString());const{data:c,error:s}=await i.from("cc_generation_jobs").update(o).eq("id",t).select().single();return s?C(s.message):L(c)}catch(i){const r=i instanceof Error?i.message:"Lỗi cập nhật tiến trình công việc.";return C(r)}},async getNextQueued(){try{const t=g(),{data:n,error:e}=await t.from("cc_generation_jobs").select("*").eq("status","queued").order("priority",{ascending:!0}).order("created_at",{ascending:!0}).limit(1).maybeSingle();return e?C(e.message):L(n)}catch(t){const n=t instanceof Error?t.message:"Lỗi lấy công việc tiếp theo trong hàng đợi.";return C(n)}},async listJobs(t,n={}){try{const e=g(),i=n.limit??20,r=n.offset??0;let o=e.from("cc_generation_jobs").select("*",{count:"exact"}).eq("created_by",t);n.status&&(Array.isArray(n.status)?o=o.in("status",n.status):o=o.eq("status",n.status)),n.jobType&&(o=o.eq("job_type",n.jobType)),o=o.order("created_at",{ascending:!1}).range(r,r+i-1);const{data:c,error:s,count:a}=await o;return s?C(s.message):L({jobs:c??[],total:a??0})}catch(e){const i=e instanceof Error?e.message:"Lỗi tải danh sách công việc.";return C(i)}},async getProcessingCount(){try{const t=g(),{count:n,error:e}=await t.from("cc_generation_jobs").select("id",{count:"exact",head:!0}).eq("status","processing");return e?C(e.message):L(n??0)}catch(t){const n=t instanceof Error?t.message:"Lỗi đếm công việc đang xử lý.";return C(n)}},getJobTypeLabel(t){return Lt[t]??t}},v={isRunning:!1,channel:null,callbacks:{onJobComplete:()=>{},onJobFailed:()=>{},onJobCreated:()=>{},onJobProcessing:()=>{}}};async function It(t,n,e){var i;try{const r=g(),o=t.input_params,c=((i=t.metadata)==null?void 0:i.label)??t.job_type;await r.from("cc_notifications").insert({user_id:t.created_by,title:n?`${c} hoàn thành`:`${c} thất bại`,message:n?`Công việc "${o.topic??c}" đã hoàn thành thành công.`:`Công việc "${o.topic??c}" thất bại: ${e??"Lỗi không xác định."}`,category:"generation",severity:n?"info":"medium",entity_type:"generation_job",entity_id:t.id,metadata:{}})}catch{}}function se(t){var r;const n=t.new,e=(r=t.old)==null?void 0:r.status,i=n.status;if(e!==i)switch(i){case"processing":v.callbacks.onJobProcessing(n);break;case"completed":v.callbacks.onJobComplete(n),It(n,!0).catch(()=>{});break;case"failed":{const o=n.error_message??"Lỗi không xác định.";v.callbacks.onJobFailed(n,o),It(n,!1,o).catch(()=>{});break}}}function ae(t){const n=t.new;v.callbacks.onJobCreated(n)}const Ci={start(t={}){if(v.isRunning)return;v.isRunning=!0,v.callbacks={onJobComplete:t.onJobComplete??(()=>{}),onJobFailed:t.onJobFailed??(()=>{}),onJobCreated:t.onJobCreated??(()=>{}),onJobProcessing:t.onJobProcessing??(()=>{})};const n=g();v.channel=n.channel("job-runner-monitor").on("postgres_changes",{event:"UPDATE",schema:"public",table:"cc_generation_jobs"},se).on("postgres_changes",{event:"INSERT",schema:"public",table:"cc_generation_jobs"},ae).subscribe()},stop(){v.isRunning=!1,v.channel&&(v.channel.unsubscribe(),v.channel=null)},isRunning(){return v.isRunning},async getActiveCount(){const t=g(),{count:n}=await t.from("cc_generation_jobs").select("id",{count:"exact",head:!0}).eq("status","processing");return n??0},async getActiveJobIds(){const t=g(),{data:n}=await t.from("cc_generation_jobs").select("id").eq("status","processing");return(n??[]).map(e=>e.id)}},P=new Map;let Rt=0,V=null,j=null;function he(){return Rt+=1,`task_${Date.now()}_${Rt}`}function tt(t){return{data:null,error:t,success:!1}}function $(t){return{data:t,error:null,success:!0}}async function ue(t,n,e,i){try{await g().from("cc_notifications").insert({user_id:t,title:"Nhắc nhở sự kiện",message:`Sự kiện "${n}" sẽ bắt đầu trong ${i} phút nữa.`,category:"calendar",severity:"info",entity_type:"calendar_event",entity_id:e,action_label:"Xem sự kiện",action_url:`/calendar?event=${e}`,metadata:{}})}catch{}}const vi={scheduleReminder(t){try{const n=t.minutesBefore??30,e=new Date(t.scheduledAt.getTime()-n*60*1e3),i=new Date,r=Math.max(0,e.getTime()-i.getTime()),o=he(),c=setTimeout(async()=>{await ue(t.userId,t.eventTitle,t.eventId,n),P.delete(o)},r),s={id:o,type:"reminder",label:`Nhắc nhở: ${t.eventTitle} (${n} phút trước)`,scheduledAt:e,timerId:c};return P.set(o,s),$(s)}catch(n){const e=n instanceof Error?n.message:"Lỗi lên lịch nhắc nhở.";return tt(e)}},scheduleDailyCleanup(){try{if(V!==null)return $("Tác vụ dọn dẹp hàng ngày đã được lên lịch trước đó.");const t=async()=>{var e,i;try{const r=g();await r.rpc("run_daily_cleanup");const{data:o}=await r.auth.getSession(),c=(i=(e=o==null?void 0:o.session)==null?void 0:e.user)==null?void 0:i.id;c&&await r.from("cc_notifications").insert({user_id:c,title:"Dọn dẹp hệ thống",message:"Tác vụ dọn dẹp dữ liệu hàng ngày đã hoàn thành.",category:"system",severity:"info",metadata:{type:"daily_cleanup",timestamp:new Date().toISOString()}})}catch{}};t();const n=1440*60*1e3;return V=setInterval(t,n),$("Đã lên lịch dọn dẹp hàng ngày.")}catch(t){const n=t instanceof Error?t.message:"Lỗi lên lịch dọn dẹp hàng ngày.";return tt(n)}},scheduleWeeklyAnalysis(){try{if(j!==null)return $("Tác vụ phân tích hàng tuần đã được lên lịch trước đó.");const t=async()=>{try{await g().functions.invoke("weekly-report",{body:{trigger:"scheduled",timestamp:new Date().toISOString()}})}catch{}},n=10080*60*1e3;return j=setInterval(t,n),$("Đã lên lịch phân tích hàng tuần.")}catch(t){const n=t instanceof Error?t.message:"Lỗi lên lịch phân tích hàng tuần.";return tt(n)}},cancelTask(t){const n=P.get(t);return n?(clearTimeout(n.timerId),P.delete(t),$(null)):tt(`Không tìm thấy tác vụ với ID "${t}".`)},cancelAll(){for(const[t,n]of P.entries())clearTimeout(n.timerId),P.delete(t);V!==null&&(clearInterval(V),V=null),j!==null&&(clearInterval(j),j=null)},getActiveTasks(){return Array.from(P.values())},getActiveTaskCount(){return P.size}},Ct={generation_complete:"Tạo nội dung hoàn thành",review_needed:"Cần duyệt nội dung",analytics_ready:"Báo cáo phân tích sẵn sàng",job_failed:"Công việc thất bại",daily_cleanup:"Dọn dẹp hệ thống hàng ngày",content_published:"Nội dung đã xuất bản"};function le(t){const n=Ct[t.event]??t.event;return{text:`[GEM Content Center] ${n}`,blocks:[{type:"header",text:{type:"plain_text",text:`📌 ${n}`}},{type:"section",fields:Object.entries(t.data).slice(0,10).map(([e,i])=>({type:"mrkdwn",text:`*${e}:*
${String(i)}`}))},{type:"context",elements:[{type:"mrkdwn",text:`GEM Content Control Center | ${new Date(t.timestamp).toLocaleString("vi-VN")}`}]}]}}function ge(t){const n=Ct[t.event]??t.event,e=Object.entries(t.data).slice(0,10).map(([i,r])=>`• <b>${i}:</b> ${String(r)}`).join(`
`);return[`<b>📌 ${n}</b>`,"",e,"",`<i>GEM Content Center — ${new Date(t.timestamp).toLocaleString("vi-VN")}</i>`].join(`
`)}const Si={async sendToSlack(t,n,e){try{const i={event:n,timestamp:new Date().toISOString(),data:e},r=le(i),o=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});return{channel:"slack",success:o.ok,statusCode:o.status,errorMessage:o.ok?void 0:`Slack trả về HTTP ${o.status}.`}}catch(i){return{channel:"slack",success:!1,errorMessage:i instanceof Error?i.message:"Lỗi gửi Slack webhook."}}},async sendToTelegram(t,n,e,i){try{const r={event:e,timestamp:new Date().toISOString(),data:i},o=ge(r),c=await fetch(`https://api.telegram.org/bot${t}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:n,text:o,parse_mode:"HTML",disable_web_page_preview:!0})}),s=await c.json(),a=(s==null?void 0:s.ok)===!0;return{channel:"telegram",success:a,statusCode:c.status,errorMessage:a?void 0:`Telegram API lỗi: ${(s==null?void 0:s.description)??"Không rõ."}`}}catch(r){return{channel:"telegram",success:!1,errorMessage:r instanceof Error?r.message:"Lỗi gửi Telegram webhook."}}},async configure(t,n){try{const e=g(),{data:i}=await e.from("profiles").select("preferences").eq("id",t).single(),r=(i==null?void 0:i.preferences)??{},o=r.webhooks??[],c=o.findIndex(a=>a.channel===n.channel);c>=0?o[c]=n:o.push(n);const{error:s}=await e.from("profiles").update({preferences:{...r,webhooks:o},updated_at:new Date().toISOString()}).eq("id",t);return s?{data:null,error:s.message,success:!1}:{data:n,error:null,success:!0}}catch(e){return{data:null,error:e instanceof Error?e.message:"Lỗi lưu cấu hình webhook.",success:!1}}},async getConfigs(t){try{const n=g(),{data:e,error:i}=await n.from("profiles").select("preferences").eq("id",t).single();return i?{data:null,error:i.message,success:!1}:{data:((e==null?void 0:e.preferences)??{}).webhooks??[],error:null,success:!0}}catch(n){return{data:null,error:n instanceof Error?n.message:"Lỗi tải cấu hình webhook.",success:!1}}},async dispatch(t,n,e){const{data:i}=await this.getConfigs(t);if(!i||i.length===0)return[];const r=[];for(const o of i)if(!(!o.isActive||!o.events.includes(n))){if(o.channel==="slack"){const c=await this.sendToSlack(o.url,n,e);r.push(c)}else if(o.channel==="telegram"){const s=(o.metadata??{}).chatId??"",a=await this.sendToTelegram(o.url,s,n,e);r.push(a)}}return r},getEventLabel(t){return Ct[t]??t}},de="1.0.0",nt="backups",me=["cc_scripts","cc_titles","cc_social_posts","cc_image_prompts","cc_calendar_events","cc_generation_jobs"],ft={cc_scripts:"scripts",cc_titles:"titles",cc_social_posts:"socialPosts",cc_image_prompts:"imagePrompts",cc_calendar_events:"calendarEvents",cc_generation_jobs:"generationJobs"};function S(t){return{data:null,error:t,success:!1}}function D(t){return{data:t,error:null,success:!0}}function pe(){var i;const t=new Date,n=t.toISOString().split("T")[0],e=((i=t.toTimeString().split(" ")[0])==null?void 0:i.replace(/:/g,""))??"000000";return`backup_${n}_${e}.json`}const _i={async exportAllData(t){try{const n=g(),e={},i={};let r=0;for(const c of me){const{data:s,error:a}=await n.from(c).select("*").eq("created_by",t).order("created_at",{ascending:!1});if(a){e[ft[c]??c]=[],i[c]=0;continue}const h=s??[];e[ft[c]??c]=h,i[c]=h.length,r+=h.length}const o={version:de,createdAt:new Date().toISOString(),userId:t,tables:e,metadata:{totalRecords:r,tablesCounts:i}};return D(o)}catch(n){const e=n instanceof Error?n.message:"Lỗi xuất dữ liệu sao lưu.";return S(e)}},async importData(t,n){try{if(!t.version||!t.tables)return S("Định dạng file sao lưu không hợp lệ.");const e=g();let i=0;const r=[],o=Object.entries(t.tables),c={};for(const[s,a]of Object.entries(ft))c[a]=s;for(const[s,a]of o){if(!a||a.length===0)continue;const h=c[s];if(!h){r.push(`Không nhận dạng được bảng: ${s}`);continue}const p=a.map(y=>({...y,created_by:n,id:void 0})),{error:f}=await e.from(h).insert(p);f?r.push(`Lỗi import ${h}: ${f.message}`):i+=p.length}return D({imported:i,errors:r})}catch(e){const i=e instanceof Error?e.message:"Lỗi khôi phục dữ liệu từ sao lưu.";return S(i)}},async uploadBackup(t,n){try{const e=g(),i=pe(),r=`${t}/${i}`,o=JSON.stringify(n,null,2),c=new Blob([o],{type:"application/json"}),{error:s}=await e.storage.from(nt).upload(r,c,{contentType:"application/json",upsert:!1});if(s)return S(`Lỗi tải lên sao lưu: ${s.message}`);const a={name:i,path:r,size:o.length,createdAt:new Date().toISOString()};return D(a)}catch(e){const i=e instanceof Error?e.message:"Lỗi tải lên bản sao lưu.";return S(i)}},async listBackups(t){try{const n=g(),e=`${t}/`,{data:i,error:r}=await n.storage.from(nt).list(e,{sortBy:{column:"created_at",order:"desc"}});if(r)return S(`Lỗi liệt kê bản sao lưu: ${r.message}`);const o=(i??[]).filter(c=>c.name.endsWith(".json")).map(c=>{var s;return{name:c.name,path:`${e}${c.name}`,size:((s=c.metadata)==null?void 0:s.size)??0,createdAt:c.created_at??""}});return D(o)}catch(n){const e=n instanceof Error?n.message:"Lỗi liệt kê bản sao lưu.";return S(e)}},async downloadBackup(t,n){try{const e=g(),i=`${t}/${n}`,{data:r,error:o}=await e.storage.from(nt).download(i);if(o)return S(`Lỗi tải về sao lưu: ${o.message}`);if(!r)return S("Không tìm thấy file sao lưu.");const c=await r.text(),s=JSON.parse(c);return D(s)}catch(e){const i=e instanceof Error?e.message:"Lỗi tải về bản sao lưu.";return S(i)}},async deleteBackup(t,n){try{const e=g(),i=`${t}/${n}`,{error:r}=await e.storage.from(nt).remove([i]);return r?S(`Lỗi xoá bản sao lưu: ${r.message}`):D(null)}catch(e){const i=e instanceof Error?e.message:"Lỗi xoá bản sao lưu.";return S(i)}}},fe={à:"a",á:"a",ả:"a",ã:"a",ạ:"a",ă:"a",ắ:"a",ằ:"a",ẳ:"a",ẵ:"a",ặ:"a",â:"a",ấ:"a",ầ:"a",ẩ:"a",ẫ:"a",ậ:"a",è:"e",é:"e",ẻ:"e",ẽ:"e",ẹ:"e",ê:"e",ế:"e",ề:"e",ể:"e",ễ:"e",ệ:"e",ì:"i",í:"i",ỉ:"i",ĩ:"i",ị:"i",ò:"o",ó:"o",ỏ:"o",õ:"o",ọ:"o",ô:"o",ố:"o",ồ:"o",ổ:"o",ỗ:"o",ộ:"o",ơ:"o",ớ:"o",ờ:"o",ở:"o",ỡ:"o",ợ:"o",ù:"u",ú:"u",ủ:"u",ũ:"u",ụ:"u",ư:"u",ứ:"u",ừ:"u",ử:"u",ữ:"u",ự:"u",ỳ:"y",ý:"y",ỷ:"y",ỹ:"y",ỵ:"y",đ:"d",À:"a",Á:"a",Ả:"a",Ã:"a",Ạ:"a",Ă:"a",Ắ:"a",Ằ:"a",Ẳ:"a",Ẵ:"a",Ặ:"a",Â:"a",Ấ:"a",Ầ:"a",Ẩ:"a",Ẫ:"a",Ậ:"a",È:"e",É:"e",Ẻ:"e",Ẽ:"e",Ẹ:"e",Ê:"e",Ế:"e",Ề:"e",Ể:"e",Ễ:"e",Ệ:"e",Ì:"i",Í:"i",Ỉ:"i",Ĩ:"i",Ị:"i",Ò:"o",Ó:"o",Ỏ:"o",Õ:"o",Ọ:"o",Ô:"o",Ố:"o",Ồ:"o",Ổ:"o",Ỗ:"o",Ộ:"o",Ơ:"o",Ớ:"o",Ờ:"o",Ở:"o",Ỡ:"o",Ợ:"o",Ù:"u",Ú:"u",Ủ:"u",Ũ:"u",Ụ:"u",Ư:"u",Ứ:"u",Ừ:"u",Ử:"u",Ữ:"u",Ự:"u",Ỳ:"y",Ý:"y",Ỷ:"y",Ỹ:"y",Ỵ:"y",Đ:"d"},wi={generateSlug(t){let n=t;return n=n.split("").map(e=>fe[e]??e).join(""),n=n.toLowerCase(),n=n.replace(/[^a-z0-9]+/g,"-"),n=n.replace(/-+/g,"-"),n=n.replace(/^-|-$/g,""),n=n.slice(0,100),n=n.replace(/-$/,""),n||"untitled"},async ensureUnique(t,n,e="slug",i){const r=g();let o=t,c=1;for(;;){let s=r.from(n).select("id",{count:"exact",head:!0}).eq(e,o);i&&(s=s.neq("id",i));const{count:a}=await s;if((a??0)===0)return o;if(c+=1,o=`${t}-${c}`,c>100)return`${t}-${Date.now()}`}},async createUniqueSlug(t,n,e="slug",i){const r=this.generateSlug(t);return this.ensureUnique(r,n,e,i)}},ye=.3,Te=.2,Ot=.5,Ht=3;function Tt(t){return t.length===0?0:t.reduce((n,e)=>n+e,0)/t.length}function be(t){if(t.length<2)return 0;const n=Tt(t),e=t.map(i=>(i-n)**2);return Math.sqrt(e.reduce((i,r)=>i+r,0)/(t.length-1))}function et(){return new Date().toISOString()}const Ni={detectCTRDrop(t){const n=[],e=t.map(o=>o.ctr).filter(o=>typeof o=="number"&&o>0);if(e.length<Ht)return n;const i=Tt(e),r=i*(1-ye);for(const o of t){if(typeof o.ctr!="number"||o.ctr<=0||o.ctr>=r)continue;const c=(i-o.ctr)/i*100,s=c>50?"critical":c>40?"high":"medium";n.push({type:"ctr_drop",severity:s,videoId:o.youtube_id??o.id,videoTitle:o.title,metric:"CTR",currentValue:Math.round(o.ctr*100)/100,expectedValue:Math.round(i*100)/100,deviationPercent:Math.round(c*10)/10,message:`CTR video "${o.title}" ở mức ${o.ctr.toFixed(1)}%, thấp hơn ${c.toFixed(0)}% so với trung bình kênh (${i.toFixed(1)}%).`,suggestion:c>50?"Thumbnail và tiêu đề cần làm lại hoàn toàn. Thử A/B test với formula mới.":"Kiểm tra thumbnail contrast và tiêu đề. Thử thay đổi title formula.",detectedAt:et()})}return n},detectRetentionCliff(t,n,e){const i=[];if(t.length<3)return i;const r=[...t].sort((o,c)=>o.timeRatio-c.timeRatio);for(let o=1;o<r.length;o++){const c=r[o-1],s=r[o];if(!c||!s)continue;const a=c.watchRatio-s.watchRatio,h=c.watchRatio>0?a/c.watchRatio:0;if(h<Te)continue;const p=Math.round(s.timeRatio*100),f=h>.4?"critical":h>.3?"high":"medium";i.push({type:"retention_cliff",severity:f,videoId:n,videoTitle:e,metric:"Audience Retention",currentValue:Math.round(s.watchRatio*100),expectedValue:Math.round(c.watchRatio*100),deviationPercent:Math.round(h*100),message:`Drop-off ${Math.round(h*100)}% tại ${p}% video${e?` "${e}"`:""}. Retention giảm từ ${Math.round(c.watchRatio*100)}% xuống ${Math.round(s.watchRatio*100)}%.`,suggestion:p<10?"Hook quá yếu. Mở đầu cần gây tò mò mạnh hơn trong 10 giây đầu.":p<30?"Phần mở rộng (context) quá dài. Đi thẳng vào nội dung chính sớm hơn.":"Nội dung mất hấp dẫn. Thêm pattern-interrupt (câu hỏi tu từ, ví dụ bất ngờ) tại điểm này.",detectedAt:et()})}return i},detectRevenueAnomaly(t){const n=[],e=t.map(s=>s.estimated_revenue??s.estimatedRevenue).filter(s=>typeof s=="number"&&s>0);if(e.length<Ht)return n;const i=Tt(e),r=be(e),o=i+i*Ot,c=i-i*Ot;for(const s of t){const a=s.estimated_revenue??s.estimatedRevenue;if(!(typeof a!="number"||a<=0)){if(a>o){const h=(a-i)/i*100;n.push({type:"revenue_spike",severity:h>100?"high":"medium",videoId:s.youtube_id??s.id,videoTitle:s.title,metric:"Revenue (USD)",currentValue:Math.round(a*100)/100,expectedValue:Math.round(i*100)/100,deviationPercent:Math.round(h),message:`Revenue video "${s.title}" cao hơn ${Math.round(h)}% so với trung bình ($${a.toFixed(2)} vs $${i.toFixed(2)}).`,suggestion:"Phân tích yếu tố thành công: track, title formula, persona. Nhân rộng pattern này.",detectedAt:et()})}else if(a<c&&r>0){const h=(i-a)/i*100;n.push({type:"revenue_drop",severity:h>80?"high":"medium",videoId:s.youtube_id??s.id,videoTitle:s.title,metric:"Revenue (USD)",currentValue:Math.round(a*100)/100,expectedValue:Math.round(i*100)/100,deviationPercent:Math.round(h),message:`Revenue video "${s.title}" thấp hơn ${Math.round(h)}% so với trung bình ($${a.toFixed(2)} vs $${i.toFixed(2)}).`,suggestion:"Kiểm tra content type và track. Revenue thấp thường do audience không khớp với advertiser.",detectedAt:et()})}}}return n},detectAll(t,n){const e=[...this.detectCTRDrop(t),...this.detectRevenueAnomaly(t)];if(n)for(const{videoId:r,videoTitle:o,data:c}of n)e.push(...this.detectRetentionCliff(c,r,o));const i={critical:0,high:1,medium:2,low:3};return e.sort((r,o)=>(i[r.severity]??3)-(i[o.severity]??3)),{anomalies:e}}},$t={wealth:{keywords:["bitcoin","crypto","trading","đầu tư","tài chính","tiền","giao dịch","portfolio","lợi nhuận","cắt lỗ","chốt lời","chart","xu hướng","altcoin","blockchain","defi","nft","thị trường","vốn","cổ phiếu","bất động sản","thu nhập","scanner","whale","token","leverage","margin"],weight:1},wellness:{keywords:["thiền","tần số","năng lượng","tâm thức","chữa lành","nghiệp","rung động","giác ngộ","tâm linh","thức tỉnh","meditation","healing","karma","phật","tu tập","từ bi","bình an","chánh niệm","trí tuệ","giải thoát","luân hồi","tarot","tình yêu","sức khỏe tinh thần"],weight:1},integration:{keywords:["cuộc sống","hành trình","cân bằng","phát triển bản thân","kết hợp","tích hợp","tổng thể","mindful trading","tài chính tâm thức","giàu có thật sự","tự do tài chính","mục đích sống","ý nghĩa","hạnh phúc","thành công","sứ mệnh","legacy","cộng đồng","cho đi","tri ân"],weight:1.2}},Dt={latc:{keywords:["sự thật","bí mật","không ai nói","trường học","quy tắc","chiến lược","framework","hệ thống","phân tích sâu","deep dive","toàn diện"],weight:1},tmt:{keywords:["thầy minh tuệ","sư","tu sĩ","tu hành","khất sĩ","nhân quả","đề bà","phật pháp","tăng đoàn","giới luật","bộ hành","đầu trần chân đất"],weight:1.5},short_clip:{keywords:["nhanh","ngắn","30 giây","1 phút","tip","hack","câu hỏi nhanh","reels","shorts","tiktok"],weight:1},social_post:{keywords:["post","bài đăng","facebook","instagram","threads","caption","hashtag","mạng xã hội","social"],weight:1},news:{keywords:["tin tức","news","blog","bài viết","phân tích","thị trường","SEO","báo chí","chuyên đề"],weight:1}},Gt={jennie_mentor:{keywords:["hướng dẫn","dẫn dắt","chia sẻ","kinh nghiệm","bài học","con đường"],weight:1},jennie_provocateur:{keywords:["sai lầm","thách thức","phá vỡ","khó nghe","sự thật phũ","dám","brutal"],weight:1.2},jennie_storyteller:{keywords:["câu chuyện","kể","ngày xưa","hành trình","trải nghiệm","cảm xúc"],weight:1},jennie_analyst:{keywords:["số liệu","phân tích","dữ liệu","thống kê","biểu đồ","evidence","research"],weight:1},jennie_motivator:{keywords:["bạn có thể","hành động","bắt đầu ngay","thay đổi","động lực","năng lượng"],weight:1},jennie_educator:{keywords:["giải thích","bước","hướng dẫn","framework","hệ thống","cách làm"],weight:1},jennie_confidante:{keywords:["tâm sự","thấu hiểu","nỗi đau","cô đơn","ôm","bình yên","lắng nghe"],weight:1}};function G(t,n){const e=t.toLowerCase(),i={};let r=-1,o;for(const c of Object.keys(n)){const s=n[c];let a=0;for(const h of s.keywords){const p=new RegExp(h.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"),f=e.match(p);f&&(a+=f.length*s.weight)}i[c]=a,a>r&&(r=a,o=c)}return o===void 0&&(o=Object.keys(n)[0]),{winner:o,scores:i}}function B(t){const n=Object.values(t),e=n.reduce((o,c)=>o+c,0);if(e===0)return 0;const r=Math.max(...n)/e;return Math.min(1,Math.max(0,r))}const Mi={classifyContent(t){if(!t||t.trim().length===0)return{contentType:"latc",track:"integration",persona:"jennie_mentor",confidence:0};const n=G(t,Dt),e=G(t,$t),i=G(t,Gt),r=[B(n.scores),B(e.scores),B(i.scores)],o=r.reduce((c,s)=>c+s,0)/r.length;return{contentType:n.winner,track:e.winner,persona:i.winner,confidence:Math.round(o*100)/100}},classifyDetailed(t){const n=G(t,Dt),e=G(t,$t),i=G(t,Gt),r=[B(n.scores),B(e.scores),B(i.scores)],o=r.reduce((c,s)=>c+s,0)/r.length;return{result:{contentType:n.winner,track:e.winner,persona:i.winner,confidence:Math.round(o*100)/100},typeScores:n.scores,trackScores:e.scores,personaScores:i.scores}}},ke=.25,Bt=2;function Kt(t){const n=t.toLowerCase().trim(),e=new Set;for(let i=0;i<=n.length-3;i++)e.add(n.slice(i,i+3));return e}function Ce(t,n){const e=Kt(t),i=Kt(n);if(e.size===0||i.size===0)return 0;let r=0;for(const c of e)i.has(c)&&r++;const o=e.size+i.size-r;return o>0?r/o:0}function qt(t,n){let e=0,i=0;const r=Ce(t.title,n.title);if(e+=r*3,i+=3,t.track&&n.track&&t.track===n.track&&(e+=1),i+=1,t.content_type&&n.content_type&&t.content_type===n.content_type&&(e+=.5),i+=.5,t.tags&&n.tags&&t.tags.length>0&&n.tags.length>0){const o=new Set(t.tags.map(h=>h.toLowerCase())),c=new Set(n.tags.map(h=>h.toLowerCase()));let s=0;for(const h of o)c.has(h)&&s++;const a=s/Math.max(o.size,c.size);e+=a*2}return i+=2,e/i}function ve(t){const n=new Set(["và","của","cho","trong","với","là","một","các","để","từ","bạn","này","có","không","về","đến","hay","nhưng","mà","khi","thì","được","sẽ","đã","phải","nào","mỗi","the","a","an","of","to","in","for","on","with"]),e=new Map;for(const r of t){const o=r.toLowerCase().split(/\s+/).filter(s=>s.length>2&&!n.has(s)),c=new Set(o);for(const s of c)e.set(s,(e.get(s)??0)+1)}const i=Math.ceil(t.length/2);return[...e.entries()].filter(([,r])=>r>=i).sort((r,o)=>o[1]-r[1]).map(([r])=>r)}const xi={detectSeries(t){if(t.length<Bt)return[];const n=[],e=new Set;for(let i=0;i<t.length;i++){const r=t[i];if(!r||e.has(r.id))continue;const o=[r];e.add(r.id);for(let c=i+1;c<t.length;c++){const s=t[c];if(!s||e.has(s.id))continue;qt(r,s)>=ke&&(o.push(s),e.add(s.id))}o.length>=Bt&&n.push(o)}return n.map(i=>{var p;const r=this.suggestSeriesName(i),o=new Map;for(const f of i){const y=f.track??"integration";o.set(y,(o.get(y)??0)+1)}const c=((p=[...o.entries()].sort((f,y)=>y[1]-f[1])[0])==null?void 0:p[0])??"integration";let s=0,a=0;for(let f=0;f<i.length;f++)for(let y=f+1;y<i.length;y++){const u=i[f],d=i[y];u&&d&&(s+=qt(u,d),a++)}const h=a>0?Math.round(s/a*100)/100:0;return{name:r,scripts:this.reorderSeries(i),track:c,confidence:h}})},suggestSeriesName(t){var r;const n=t.map(o=>o.title),e=ve(n);if(e.length>0){const o=e.slice(0,3).join(" ");return`Series: ${o.charAt(0).toUpperCase()}${o.slice(1)}`}const i=t[0];return i?`Series: ${((r=i.title.split(/[—–\-:]/)[0])==null?void 0:r.trim())??i.title}`:"Series: Untitled"},reorderSeries(t){return[...t].sort((n,e)=>{const i=new Date(n.created_at).getTime(),r=new Date(e.created_at).getTime();return i-r})}},Ut=.6,Se=.25,_e=5;function Vt(t){const n=t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,"").trim(),e=new Set;if(n.length<3)return e.add(n),e;for(let i=0;i<=n.length-3;i++)e.add(n.slice(i,i+3));return e}function we(t,n){if(t.size===0&&n.size===0)return 1;if(t.size===0||n.size===0)return 0;let e=0;for(const r of t)n.has(r)&&e++;const i=t.size+n.size-e;return i>0?e/i:0}function Ne(t,n){const e=new Set(t.toLowerCase().split(/\s+/).filter(c=>c.length>1)),i=new Set(n.toLowerCase().split(/\s+/).filter(c=>c.length>1));if(e.size===0||i.size===0)return 0;let r=0;for(const c of e)i.has(c)&&r++;const o=e.size+i.size-r;return o>0?r/o:0}function Me(t,n){const e=we(Vt(t),Vt(n)),i=Ne(t,n);return e*.6+i*.4}const Ai={checkDuplicate(t,n,e=Ut){if(!t.trim()||n.length===0)return{isDuplicate:!1,similarScript:null,similarity:0,candidates:[]};const i=[];for(const c of n){const s=Me(t,c.title);s>=Se&&i.push({id:c.id,title:c.title,similarity:Math.round(s*1e3)/1e3})}i.sort((c,s)=>s.similarity-c.similarity);const r=i.slice(0,_e),o=r[0]??null;return{isDuplicate:o!==null&&o.similarity>=e,similarScript:o,similarity:(o==null?void 0:o.similarity)??0,candidates:r}},checkBatch(t,n,e=Ut){const i=new Map;for(const r of t)i.set(r,this.checkDuplicate(r,n,e));return i}};function E(t,n){const e=new Map;for(const i of t){const r=n(i);if(r===void 0)continue;const o=e.get(r);o?o.push(i):e.set(r,[i])}return e}function R(t){return t.length===0?0:t.reduce((n,e)=>n+e,0)/t.length}function it(t,n,e){const i=e.map(c=>c.ctr).filter(c=>c>0),r=e.map(c=>c.views).filter(c=>c>0),o=e.map(c=>c.estimated_revenue).filter(c=>typeof c=="number"&&c>0);return{param:t,value:n,avgCTR:Math.round(R(i)*100)/100,avgViews:Math.round(R(r)),avgRevenue:Math.round(R(o)*100)/100,sampleSize:e.length}}const Pi={analyzePerformanceByParams(t){const n=t.filter(u=>u.ctr>0),e=E(n,u=>u.writing_mode),i=[];for(const[u,d]of e)i.push(it("writingMode",u,d));i.sort((u,d)=>d.avgCTR-u.avgCTR);const r=E(n,u=>u.persona),o=[];for(const[u,d]of r)o.push(it("persona",u,d));o.sort((u,d)=>d.avgCTR-u.avgCTR);const c=E(n,u=>u.track),s=[];for(const[u,d]of c)s.push(it("track",u,d));s.sort((u,d)=>d.avgCTR-u.avgCTR);const a=E(n,u=>u.title_formula),h=[];for(const[u,d]of a)h.push(it("titleFormula",u,d));h.sort((u,d)=>d.avgCTR-u.avgCTR);let p=null;const f=E(n,u=>u.persona&&u.writing_mode&&u.track?`${u.persona}|${u.writing_mode}|${u.track}`:void 0);let y=0;for(const[u,d]of f){if(d.length<2)continue;const l=R(d.map(m=>m.ctr));if(l>y){y=l;const[m,T,M]=u.split("|");m&&T&&M&&(p={persona:m,writingMode:T,track:M,avgCTR:Math.round(l*100)/100})}}return{byWritingMode:i,byPersona:o,byTrack:s,byTitleFormula:h,topCombination:p}},getOptimalParams(t,n){let e=t.filter(u=>u.ctr>0);if(n!=null&&n.track&&(e=e.filter(u=>u.track===n.track)),n!=null&&n.persona&&(e=e.filter(u=>u.persona===n.persona)),e.length===0)return{persona:(n==null?void 0:n.persona)??"jennie_mentor",writingMode:"mode_1_calm",titleFormula:null,confidence:0,basedOnSamples:0};const i=E(e,u=>u.persona);let r="jennie_mentor",o=0;for(const[u,d]of i){const l=R(d.map(m=>m.ctr));l>o&&(o=l,r=u)}const c=E(e,u=>u.writing_mode);let s="mode_1_calm",a=0;for(const[u,d]of c){const l=R(d.map(m=>m.ctr));l>a&&(a=l,s=u)}const h=E(e,u=>u.title_formula);let p=null,f=0;for(const[u,d]of h){if(d.length<2)continue;const l=R(d.map(m=>m.ctr));l>f&&(f=l,p=u)}const y=Math.min(1,e.length/20);return{persona:(n==null?void 0:n.persona)??r,writingMode:s,titleFormula:p,confidence:Math.round(y*100)/100,basedOnSamples:e.length}}},J=2,ot=5,rt=1.5;function I(t){return t.length===0?0:t.reduce((n,e)=>n+e,0)/t.length}function jt(t){if(t.length<2)return 1;const n=I(t),e=t.map(i=>(i-n)**2);return Math.sqrt(e.reduce((i,r)=>i+r,0)/(t.length-1))}const Ei={predictCTR(t,n){const e=n.filter(l=>l.ctr>0);if(e.length===0)return{estimated:ot,rangeLow:ot*.5,rangeHigh:ot*1.5,confidence:0,sampleSize:0,factors:[]};const i=[];if(t.track){const l=e.filter(m=>m.track===t.track);if(l.length>=J){const m=l.map(T=>T.ctr);i.push({name:"Track",value:t.track,avgCTR:Math.round(I(m)*100)/100,weight:1,sampleSize:l.length})}}if(t.persona){const l=e.filter(m=>m.persona===t.persona);if(l.length>=J){const m=l.map(T=>T.ctr);i.push({name:"Persona",value:t.persona,avgCTR:Math.round(I(m)*100)/100,weight:1.2,sampleSize:l.length})}}if(t.writingMode){const l=e.filter(m=>m.writing_mode===t.writingMode);if(l.length>=J){const m=l.map(T=>T.ctr);i.push({name:"Writing Mode",value:t.writingMode,avgCTR:Math.round(I(m)*100)/100,weight:.8,sampleSize:l.length})}}if(t.titleFormula){const l=e.filter(m=>m.title_formula===t.titleFormula);if(l.length>=J){const m=l.map(T=>T.ctr);i.push({name:"Title Formula",value:t.titleFormula,avgCTR:Math.round(I(m)*100)/100,weight:1.5,sampleSize:l.length})}}if(t.thumbnailPalette){const l=e.filter(m=>m.thumbnail_palette===t.thumbnailPalette);if(l.length>=J){const m=l.map(T=>T.ctr);i.push({name:"Thumbnail Palette",value:t.thumbnailPalette,avgCTR:Math.round(I(m)*100)/100,weight:1.3,sampleSize:l.length})}}if(i.length===0){const l=e.map(M=>M.ctr),m=I(l),T=jt(l);return{estimated:Math.round(m*100)/100,rangeLow:Math.round(Math.max(0,m-T*rt)*100)/100,rangeHigh:Math.round((m+T*rt)*100)/100,confidence:.1,sampleSize:e.length,factors:[]}}let r=0,o=0,c=0;for(const l of i){const m=Math.log2(l.sampleSize+1),T=l.weight*m;r+=l.avgCTR*T,o+=T,c+=l.sampleSize}const s=o>0?r/o:ot,a=i.map(l=>l.avgCTR),h=a.length>1?jt(a):s*.2,p=Math.max(0,s-h*rt),f=s+h*rt,y=Math.min(1,i.length/4),u=Math.min(1,c/30),d=y*.4+u*.6;return{estimated:Math.round(s*100)/100,rangeLow:Math.round(p*100)/100,rangeHigh:Math.round(f*100)/100,confidence:Math.round(d*100)/100,sampleSize:c,factors:i}}},xe=["sợ hãi","đau","mất","khóc","yêu","ghét","giận","tuyệt vọng","hạnh phúc","hy vọng","shock","sốc","bất ngờ","kinh hoàng","cảm ơn","tha thứ","xin lỗi","buông bỏ","thức tỉnh","giác ngộ","nghẹn ngào","rung động","run rẩy","lạnh sống lưng","tim đập","nỗi đau","nước mắt","ôm","chữa lành","phá vỡ","tan nát"],Jt=[/bạn có (?:bao giờ|biết|tin)/i,/sự thật (?:là|mà|đáng sợ)/i,/không ai (?:nói|dám|dạy)/i,/tại sao (?:bạn|người|ai)/i,/bí mật/i,/\d+ (?:sai lầm|điều|cách|bước|lý do)/i,/dừng lại/i,/hãy (?:tưởng tượng|nghĩ|nhìn)/i,/câu chuyện (?:này|của|mà)/i,/nếu (?:bạn|ai|ngày)/i,/vì sao/i,/jennie (?:từng|đã|cũng)/i],Ae=["hãy tưởng tượng","nhìn","thấy","ánh sáng","bóng tối","biển","núi","mặt trời","ngọn nến","gương","cánh cửa","con đường","dòng sông","ngã tư","chart","biểu đồ","cánh chim","ngọn lửa","hạt giống","cây","vườn"],Pe=["bởi vì","tại vì","cho nên","vì vậy","nghĩa là","ví dụ","đơn giản","nói cách khác","tóm lại"];function yt(t,n){const e=t.toLowerCase();let i=0;for(const r of n)e.includes(r.toLowerCase())&&i++;return i}function Ft(t,n){let e=0;for(const i of n)i.test(t)&&e++;return e}function Ee(t){return t.split(/\s+/).filter(n=>n.length>0).length}function ct(t,n,e){return Math.max(n,Math.min(e,t))}function Le(t){var i,r;const n=t.split(/^##\s+(.+)$/m),e=[];for(let o=1;o<n.length;o+=2){const c=((i=n[o])==null?void 0:i.trim())??"",s=((r=n[o+1])==null?void 0:r.trim())??"";c&&s&&e.push({title:c,content:s})}return e}const Li={scoreSection(t){const n=Ee(t),e=yt(t,xe),i=ct(e*2,0,10),r=Ft(t,Jt),o=t.split(/[.!?]\s/)[0]??"",c=Ft(o,Jt)>0?3:0,s=ct(r*2+c,0,10),a=yt(t,Pe),h=/\?/.test(t),p=/vì vậy|cho nên|tóm lại|nghĩa là/i.test(t),f=ct(a*1.5+(h?2:0)+(p?2:0)+3,0,10);let y;n<=30?y=6:n<=80?y=10:n<=150?y=7:n<=250?y=4:y=2;const u=yt(t,Ae),d=ct(u*2,0,10),l=i*.25+s*.3+f*.15+y*.15+d*.15,m=Math.round(l*10)/10,T=[];return s>=7?T.push("Hook mạnh"):s<=3&&T.push("Thiếu hook gây chú ý"),i>=7&&T.push("Cảm xúc mãnh liệt"),y>=8?T.push("Độ dài lý tưởng cho clip"):y<=4&&T.push("Quá dài, cần cắt ngắn"),d>=6&&T.push("Giàu hình ảnh"),{score:m,factors:{emotionalIntensity:i,standaloneClarity:f,hookQuality:s,brevity:y,visualPotential:d},text:t.length>200?t.slice(0,200)+"...":t,explanation:T.length>0?T.join(". ")+".":"Điểm trung bình, có thể cải thiện hook và cảm xúc."}},suggestBestClips(t,n=3){const e=Le(t);if(e.length===0){const r=this.scoreSection(t);return[{sectionIndex:0,sectionTitle:"Toàn bộ nội dung",clipText:t,score:r}]}const i=e.map((r,o)=>({sectionIndex:o,sectionTitle:r.title,clipText:r.content,score:this.scoreSection(r.content)}));return i.sort((r,o)=>o.score.score-r.score.score),i.slice(0,n)}};function Ie(){return!!window.__TAURI_INTERNALS__}async function q(){if(!Ie())throw new Error("Chức năng này chỉ khả dụng trên Desktop");return(await Function('return import("@tauri-apps/api/core")')()).invoke}async function Re(t,n,e="D:\\GEM-Content-Agent\\models\\ggml-base.bin"){const i=await q();try{n==null||n({stage:"transcribing",percent:10,message:"Starting Whisper transcription..."});const r=await i("transcribe_audio",{audioPath:t,modelPath:e});return n==null||n({stage:"complete",percent:100,message:"Transcription complete"}),r}catch(r){const o=r instanceof Error?r.message:String(r);throw n==null||n({stage:"error",percent:0,message:o}),new Error(`Transcription failed: ${o}`)}}async function Ii(t,n,e="D:\\GEM-Content-Agent\\models\\ggml-base.bin"){const i=await q();n==null||n({stage:"extracting",percent:5,message:"Extracting audio from video..."});const r=t.replace(/\.[^.]+$/,"_extracted.wav");return await i("extract_audio",{videoPath:t,outputPath:r}),n==null||n({stage:"extracting",percent:30,message:"Audio extraction complete"}),Re(r,n,e)}async function Ri(t="D:\\GEM-Content-Agent\\models\\ggml-base.bin"){return(await q())("check_whisper_model",{modelPath:t})}async function Oi(){return(await q())("check_ffmpeg_installed")}async function Hi(t){return(await q())("get_video_info",{path:t})}async function $i(t,n){await(await q())("send_os_notification",{title:t,body:n})}const Di={scripts:300*1e3,titles:300*1e3,socialPosts:300*1e3,imagePrompts:300*1e3,calendarEvents:30*1e3,analytics:3600*1e3,insights:3600*1e3,brandRules:1440*60*1e3,profiles:600*1e3,notifications:30*1e3,dashboardStats:120*1e3,generationJobs:10*1e3},Gi={short:300*1e3,medium:1800*1e3,long:3600*1e3,persistent:1440*60*1e3},Bi={scripts:{all:["scripts"],list:t=>["scripts","list",t],detail:t=>["scripts","detail",t],stats:["scripts","stats"]},titles:{all:["titles"],byScript:t=>["titles","byScript",t]},socialPosts:{all:["socialPosts"],list:t=>["socialPosts","list",t],byCampaign:t=>["socialPosts","campaign",t]},imagePrompts:{all:["imagePrompts"],byScript:t=>["imagePrompts","byScript",t]},calendar:{all:["calendar"],byRange:(t,n)=>["calendar","range",t,n],thisWeek:["calendar","thisWeek"],distribution:["calendar","distribution"]},analytics:{all:["analytics"],videos:["analytics","videos"],insights:["analytics","insights"],latestInsight:["analytics","latestInsight"],retention:t=>["analytics","retention",t]},brandRules:{all:["brandRules"]},notifications:{all:["notifications"],unread:["notifications","unread"],count:["notifications","count"]},generationJobs:{all:["generationJobs"],active:["generationJobs","active"],detail:t=>["generationJobs","detail",t]},profiles:{current:["profiles","current"]}},Ki={"/dashboard":["scripts.stats","calendar.thisWeek","notifications.count"],"/ai-gen":["scripts.list","brandRules.all"],"/latc":["scripts.list","brandRules.all"],"/tmt":["scripts.list","brandRules.all"],"/calendar":["calendar.thisWeek","calendar.distribution"],"/analytics":["analytics.videos","analytics.latestInsight"],"/repurpose":["scripts.list"],"/brand":["brandRules.all"]};export{Gi as CACHE_TIMES,pt as CTA_PATTERNS,X as FUNNELS,Di as STALE_TIMES,ci as activityService,zi as analyticsAI,Ni as anomalyDetector,oi as authService,_i as backupService,Zt as brandVoiceChecker,st as buildSystemPrompt,De as calendarService,bi as cascadingPipeline,k as claudeService,Li as clipScorer,Mi as contentClassifier,hn as createNotification,fi as ctaRulesEngine,Ei as ctrPredictor,Ai as duplicateDetector,x as exportService,Pi as feedbackLoop,Ji as generationJobService,bn as getGemFeatures,li as getPersonaDescription,cn as getProfile,rn as getSession,Cn as getStructureForType,g as getSupabase,Vi as getSupabaseAdmin,kn as getTermConversions,gi as getTrackDescription,dn as getUnreadNotificationCount,un as getUnreadNotifications,ui as imagePromptService,ki as jobQueue,Ci as jobRunner,fn as logActivity,gn as markAllNotificationsRead,ln as markNotificationAsRead,K as modelRouter,ri as notificationService,an as onAuthStateChange,Ti as onboardingService,At as onboardingSteps,Be as plannerService,Ki as prefetchHints,Bi as queryKeys,pi as repurposeEngine,on as resetPassword,vi as schedulerService,di as scriptGenerator,si as scriptService,$i as sendDesktopNotification,xi as seriesLinker,nn as signIn,en as signOut,tn as signUp,wi as slugGenerator,hi as socialPostService,yi as syncService,mi as titleGenerator,ai as titleService,sn as updateProfile,Yi as useAppStore,_ as vietnameseNLP,Si as webhookService,Oi as whisperCheckFfmpeg,Ri as whisperCheckModel,Hi as whisperGetVideoInfo,Re as whisperTranscribe,Ii as whisperTranscribeVideo,Qi as youtubeService};
