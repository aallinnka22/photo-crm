module.exports = function adminKey(req,res,next){
  const required = process.env.ADMIN_KEY;
  if(!required){
    // якщо ADMIN_KEY не заданий — адмін-ендпоінти відключені
    return res.status(403).json({message:'ADMIN_KEY не налаштований на сервері'});
  }
  const got = req.headers['x-admin-key'];
  if(got !== required){
    return res.status(401).json({message:'Невірний X-ADMIN-KEY'});
  }
  next();
}
