Jmol.___JSVDate="$Date: 2020-09-26 05:35:55 -0500 (Sat, 26 Sep 2020) $"
Jmol.___JSVSvnRev="$LastChangedRevision: 22034 $"
Jmol.___JSVVersion="14.31.8"
Clazz.declarePackage ("JSV.common");
c$ = Clazz.declareType (JSV.common, "JSVersion");
Clazz.defineStatics (c$,
"VERSION", null,
"VERSION_SHORT", null);
{
var tmpVersion = null;
var tmpDate = null;
var tmpSVN = null;
{
tmpVersion = Jmol.___JSVVersion; tmpDate = Jmol.___JSVDate;
tmpSVN =  Jmol.___JSVSvnRev;
}if (tmpDate != null) tmpDate = tmpDate.substring (7, 23);
tmpSVN = (tmpSVN == null ? "" : "/SVN" + tmpSVN.substring (22, 27));
JSV.common.JSVersion.VERSION_SHORT = (tmpVersion != null ? tmpVersion : "(Unknown version)");
JSV.common.JSVersion.VERSION = JSV.common.JSVersion.VERSION_SHORT + tmpSVN + "/" + (tmpDate != null ? tmpDate : "(Unknown date)");
}