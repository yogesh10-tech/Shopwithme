# 🏷️ Barcode Feature - Quick Start Guide

## 🎯 For End Users (Cashiers)

### Scanning Barcodes
1. In **Bills/Sales** section, click **"📸 बारकोड स्क्यान्न"**
2. Point camera at barcode
3. Scanner automatically detects and processes
4. Enter quantity and click **"थप्नुहोस्"** (Add)

### Works Offline!
- If internet is down, scanner still works
- Shows **"📵 ऑफलाइन"** in title
- Products loaded from local cache
- See blue indicator: **"💾 ऑफलाइस क्याशबाट आयो"**

### When Back Online
- Data automatically syncs
- Toast shows: **"X बारकोड सिंक भयो ✓"**

---

## 👑 For Shop Owners

### Accessing Barcode Manager
1. Click **"अझै"** (More) in navigation
2. Select **"🏷️ बारकोड"**
3. View all products with their barcodes

### Managing Barcodes

#### Assign a Barcode
1. Click product row
2. Click **"✏️ सम्पादन गर्नुहोस्"** (Edit)
3. Enter barcode manually or:
   - Click **"🔢 अटो"** to auto-generate EAN-13
4. Click **"✓ सेभ गर्नुहोस्"** (Save)

#### Auto-Generate EAN-13
1. Click **"🔢 नयाँ बारकोड"** button
2. System generates valid EAN-13
3. Review and save

#### Search Products
- Use search box at top
- Search by: barcode, product name, or category
- Results update in real-time

### Monitoring Cache

#### Cache Statistics (top of page)
- **💾 ऑफलाइन क्याश**: Total cached products
- **✓ सिंक भएको**: Successfully synced
- **⏳ सिंक हुन बाँकी**: Pending sync

#### Detailed Info
- Click **"▶ विस्तृत जानकारी"** to expand
- See: Cache size, Last sync time
- Useful for troubleshooting

#### Clear Cache (Use Carefully!)
1. Scroll to bottom
2. Click **"🗑️ क्याश मेटाउनुहोस्"**
3. Confirm deletion
4. **Warning**: Loses all offline data

---

## 🔧 Troubleshooting

### Problem: Barcode Not Found Offline
**Solution:**
1. Make sure product has a barcode assigned
2. Go to Barcode Manager to check
3. Assign barcode if missing
4. Sync by going online

### Problem: Cache Not Syncing
**Solution:**
1. Check if you're online (look for "📵" icon)
2. Refresh browser page
3. Go to Barcode Manager and check stats
4. If stuck, try "Clear Cache" option (⚠️)

### Problem: Camera Permission Denied
**Solution:**
1. Open browser settings
2. Find "Permissions" or "Camera"
3. Allow camera access for this site
4. Reload the page
5. Try scanner again

### Problem: Duplicate Barcode Error
**Solution:**
1. Go to Barcode Manager
2. Search for the barcode
3. Edit conflicting product
4. Assign different barcode
5. Save both products

### Problem: Barcode Format Invalid
**Solution:**
- Scanner accepts these formats:
  - EAN-13: 13 digits (e.g., 5901234123457)
  - EAN-8: 8 digits (e.g., 96385074)
  - CODE-128: 4-20 characters
  - CODE-39: 5-80 characters
- Check manual input for correct format

---

## 📊 Understanding Cache Stats

### Example Screen
```
💾 ऑफलाइन क्याश:  250 वस्तु
✓ सिंक भएको:      250
⏳ सिंक हुन बाँकी:  0
```

**What this means:**
- **250 products** cached locally
- **All synced** with server
- **No pending changes**
- Cache is **healthy**

### Problem Example
```
💾 ऑफलाइन क्याश:  250 वस्तु
✓ सिंक भएको:      248
⏳ सिंक हुन बाँकी:  2
```

**What this means:**
- **2 products** have pending changes
- **Not synced yet** (probably offline)
- Will sync **when online**

---

## 🌐 Online vs Offline

### ONLINE MODE ✅
```
Step 1: Scan barcode
Step 2: Look up in Firebase
Step 3: Found? Display details
Step 4: Cache updated (synced: true)
Step 5: User adds to bill
```

### OFFLINE MODE 📵
```
Step 1: Scan barcode
Step 2: Firebase unreachable (no internet)
Step 3: Fall back to local cache
Step 4: Found in cache? Display details
Step 5: Show "💾 ऑफलाइन क्याशबाट आयो"
Step 6: User adds to bill
Step 7: Queue for later sync
```

### COMING BACK ONLINE 🔄
```
Step 1: Browser detects internet restored
Step 2: Queued barcodes sync to Firebase
Step 3: Toast: "3 बारकोड सिंक भयो ✓"
Step 4: Cache refreshed with latest data
Step 5: App ready for next transaction
```

---

## 💡 Pro Tips

1. **Assign Barcodes Regularly**
   - Use "🔢 अटो" to quickly generate EAN-13
   - Each product should have a barcode
   - Speeds up checkout process

2. **Check Cache Status**
   - Before going offline, verify cache is synced
   - Look for pending count = 0
   - Takes 1 minute to sync all data

3. **Keep Browser Fresh**
   - Occasionally refresh browser (F5)
   - Ensures cache is in sync
   - Clears any temporary glitches

4. **Export Data Regularly**
   - Backup barcodes through Firebase backups
   - Protects against data loss
   - Contact support for bulk export

5. **Monitor Storage**
   - Check cache size in Barcode Manager
   - Typically 50-100KB for 1000 products
   - Browser localStorage has plenty of space

---

## ⚠️ Important Notes

### Data Safety
- ✅ Cache has checksums (prevents corruption)
- ✅ Sync status tracked (knows what's pending)
- ✅ Offline changes never lost (queued for sync)
- ✅ No duplicate barcodes allowed

### Privacy
- ✅ All data stored locally (not sent elsewhere)
- ✅ Cache cleared when user logs out
- ✅ Each shop has separate cache
- ✅ Multiple users share same cache

### Performance
- ✅ Barcode lookup: instant (< 10ms)
- ✅ Sync: fast (1-5 seconds for 100 items)
- ✅ Cache loads: quick (5-50ms)
- ✅ Works smoothly even with 1000+ products

---

## 📞 Support

### Common Questions

**Q: Do I need internet for barcodes?**
A: No! Barcodes work fully offline. Data syncs when online.

**Q: Can I lose data if offline?**
A: No! All offline changes are queued and sync when online.

**Q: How much data does cache use?**
A: Very little - about 50-100KB for 1000 products.

**Q: Can cashiers access barcode manager?**
A: No, only shop owners. Cashiers just scan.

**Q: What if I accidentally clear cache?**
A: Data remains in Firebase. Refresh to reload.

---

## 🚀 Next Steps

1. **Try It Now**
   - Go to Barcode Manager
   - Assign barcodes to top 10 products
   - Use "🔢 अटो" to auto-generate

2. **Test Offline**
   - Turn off WiFi
   - Try scanning (should work!)
   - Check cache indicator

3. **Monitor Cache**
   - Watch sync status
   - Check cache statistics
   - Verify all data synced

4. **Tell Us Feedback**
   - Works well? Let us know!
   - Issues? Report to support
   - Suggestions? We'd love to hear!

---

**Enjoy faster, offline-enabled barcode scanning! 🎉**
