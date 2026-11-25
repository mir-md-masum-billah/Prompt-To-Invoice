import BusinessProfile from "../models/businessProfileModel.js";

import { env } from "../config/env.js";
import { str } from "../utils/sanitize.js";
import mongoose from "mongoose";

const API_BASE = env.publicApiUrl;
// Only accept URLs that point to our own uploads (or empty) - blocks arbitrary/js: URLs.
const safeUrl = (v) => (typeof v === "string" && v.startsWith(`${API_BASE}/uploads/`) ? v : null);
const clampTax = (v) => Math.min(100, Math.max(0, Number.isFinite(Number(v)) ? Number(v) : 0));

// file to url

function uploadedFilesToUrls(req) {
  const urls = {};
  if (!req.files) return urls;

  const logoArr = req.files.logoName || req.files.logo || [];
  const stampArr = req.files.stampName || req.files.stamp || [];
  const sigArr = req.files.signatureNameMeta || req.files.signature || [];

  if (logoArr[0]) urls.logoUrl = `${API_BASE}/uploads/${logoArr[0].filename}`;
  if (stampArr[0]) urls.stampUrl = `${API_BASE}/uploads/${stampArr[0].filename}`;
  if (sigArr[0]) urls.signatureUrl = `${API_BASE}/uploads/${sigArr[0].filename}`;

  return urls;
}

// create a business profile
export async function createBusinessProfile(req,res) {
    try {
       const userId = req.userId;

       if(!userId){
        return res.status(401).json({
          success:false,
          message: "Authentication required" 
        })
       }

       const body = req.body || {};
        const fileUrls = uploadedFilesToUrls(req);

            const profile = new BusinessProfile({
      owner: userId,
      businessName: str(body.businessName, 120) || "My Business",
      email: str(body.email, 120),
      address: str(body.address, 300),
      phone: str(body.phone, 40),
      taxId: str(body.taxId || body.gst, 40),
      logoUrl: fileUrls.logoUrl || safeUrl(body.logoUrl),
      stampUrl: fileUrls.stampUrl || safeUrl(body.stampUrl),
      signatureUrl: fileUrls.signatureUrl || safeUrl(body.signatureUrl),
      signatureOwnerName: str(body.signatureOwnerName, 100),
      signatureOwnerTitle: str(body.signatureOwnerTitle, 100),
      defaultTaxPercent:
        body.defaultTaxPercent !== undefined ? clampTax(body.defaultTaxPercent) : 0,
    });

    const saved = await profile.save();
    return res.status(201).json({
        success: true,
        data: saved,
        message: "Business Profile Created"
    })

    } 
    
    catch (err) {
      console.error("CreateBusiness Profile error:", err);
        return res.status(500).json({
            success:false,
            message: "Server Error"
        })
    }
}

// to update business profile
export async function updateBusinessProfile(req,res){
   try {
     const userId = req.userId;

     if(!userId){
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        })
     }

     const {id} = req.params;
     const body = req.body || {};
     const fileUrls = uploadedFilesToUrls(req);

      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });
      const existing = await BusinessProfile.findOne({ _id: id, owner: userId });
      if(!existing) return res.status(404).json({
        success:false,
        message: "Business profile not found"
      })

      if(existing.owner.toString() !== userId){
         return res.status(403).json({
            success:false,
            message: "Forbidden: Not your profile."
         })
      }
      const update = {};
      if (body.businessName !== undefined) update.businessName = str(body.businessName, 120) || existing.businessName;
    if (body.email !== undefined) update.email = str(body.email, 120);
    if (body.address !== undefined) update.address = str(body.address, 300);
    if (body.phone !== undefined) update.phone = str(body.phone, 40);
    if (body.taxId !== undefined) update.taxId = str(body.taxId, 40);
    else if (body.gst !== undefined) update.taxId = str(body.gst, 40); // Support legacy GST field

    if (fileUrls.logoUrl) update.logoUrl = fileUrls.logoUrl;
    else if (body.logoUrl !== undefined) update.logoUrl = safeUrl(body.logoUrl);

    if (fileUrls.stampUrl) update.stampUrl = fileUrls.stampUrl;
    else if (body.stampUrl !== undefined) update.stampUrl = safeUrl(body.stampUrl);

    if (fileUrls.signatureUrl) update.signatureUrl = fileUrls.signatureUrl;
    else if (body.signatureUrl !== undefined) update.signatureUrl = safeUrl(body.signatureUrl);

    if (body.signatureOwnerName !== undefined) update.signatureOwnerName = str(body.signatureOwnerName, 100);
    if (body.signatureOwnerTitle !== undefined) update.signatureOwnerTitle = str(body.signatureOwnerTitle, 100);
    if (body.defaultTaxPercent !== undefined) update.defaultTaxPercent = clampTax(body.defaultTaxPercent);

    const updated = await BusinessProfile.findOneAndUpdate({ _id: id, owner: userId },update,{
   returnDocument: "after",
   runValidators:true
    });

    return res.status(200).json({
        success: true,
        data: updated,
        message: "Profile updated"
    })

   } 
   
   catch (err) {
      console.error("UpdateBusiness Profile error:", err);
        return res.status(500).json({
            success:false,
            message: "Server Error"
        })
    } 
}

// to get mybusiness profile
export async function getMyBusinessProfile(req,res){
    try {
          const userId = req.userId;

     if(!userId){
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        })
     }
        const profile = await BusinessProfile.findOne({owner: userId}).lean();
        if(!profile){
             return res.status(200).json({ success: true, data: null })
        }
         return res.status(200).json({
            success: true,
            data: profile
        });


    } 
    
     catch (err) {
      console.error("GetMyBusiness Profile error:", err);
        return res.status(500).json({
            success:false,
            message: "Server Error"
        })
    } 
}